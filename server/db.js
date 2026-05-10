import crypto from 'node:crypto';
import pg from 'pg';
import { env } from './shared/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      auth_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS oauth_accounts (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expiry_date BIGINT,
      scope TEXT,
      token_type TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      message_hash TEXT NOT NULL,
      airline TEXT NOT NULL,
      flight_number TEXT NOT NULL,
      from_iata TEXT NOT NULL,
      to_iata TEXT NOT NULL,
      departure_date TIMESTAMPTZ NOT NULL,
      duration_min INT,
      price NUMERIC,
      currency TEXT,
      cabin TEXT,
      raw_subject TEXT,
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, source, message_hash)
    );

    CREATE INDEX IF NOT EXISTS flights_user_idx ON flights(user_id, departure_date DESC);
  `);
}

export async function upsertUser({ email, displayName, authType }) {
  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    `
      INSERT INTO users (id, email, display_name, auth_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email)
      DO UPDATE SET display_name = EXCLUDED.display_name, auth_type = EXCLUDED.auth_type
      RETURNING id, email, display_name AS "displayName", auth_type AS "authType"
    `,
    [id, email.toLowerCase(), displayName, authType],
  );
  return rows[0];
}

export async function saveGoogleTokens(userId, tokens) {
  await pool.query(
    `
      INSERT INTO oauth_accounts
      (user_id, provider, access_token, refresh_token, expiry_date, scope, token_type, updated_at)
      VALUES ($1, 'google', $2, $3, $4, $5, $6, now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_accounts.refresh_token),
        expiry_date = EXCLUDED.expiry_date,
        scope = EXCLUDED.scope,
        token_type = EXCLUDED.token_type,
        updated_at = now()
    `,
    [
      userId,
      tokens.access_token || null,
      tokens.refresh_token || null,
      tokens.expiry_date || null,
      tokens.scope || null,
      tokens.token_type || null,
    ],
  );
}

export async function getGoogleTokens(userId) {
  const { rows } = await pool.query(
    `
      SELECT access_token, refresh_token, expiry_date, scope, token_type
      FROM oauth_accounts
      WHERE user_id = $1 AND provider = 'google'
    `,
    [userId],
  );
  return rows[0] || null;
}

export async function getUserById(userId) {
  const { rows } = await pool.query(
    `SELECT id, email, display_name AS "displayName", auth_type AS "authType" FROM users WHERE id = $1`,
    [userId],
  );
  return rows[0] || null;
}

export async function storeFlight(userId, source, messageHash, flight, rawPayload) {
  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    `
      INSERT INTO flights (
        id, user_id, source, message_hash, airline, flight_number, from_iata, to_iata,
        departure_date, duration_min, price, currency, cabin, raw_subject, raw_payload
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (user_id, source, message_hash) DO NOTHING
      RETURNING id
    `,
    [
      id,
      userId,
      source,
      messageHash,
      flight.airline,
      flight.flight_number,
      flight.from_iata,
      flight.to_iata,
      flight.departure_date,
      flight.duration_min ?? null,
      flight.price ?? null,
      flight.currency ?? null,
      flight.cabin ?? 'economy',
      flight.raw_subject ?? null,
      rawPayload ?? null,
    ],
  );
  return Boolean(rows[0]);
}

export async function listFlights(userId, source) {
  const params = [userId];
  let where = 'user_id = $1';
  if (source) {
    params.push(source);
    where += ` AND source = $${params.length}`;
  }

  const { rows } = await pool.query(
    `
      SELECT
        id,
        airline,
        flight_number,
        from_iata,
        to_iata,
        departure_date,
        duration_min,
        price::float AS price,
        currency,
        cabin,
        source,
        raw_subject
      FROM flights
      WHERE ${where}
      ORDER BY departure_date DESC
    `,
    params,
  );
  return rows;
}
