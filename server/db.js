import crypto from 'node:crypto';
import pg from 'pg';
import { env } from './shared/env.js';
import { computeFlightDedupKey, flightDesignator } from './shared/flightDedup.js';

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

    CREATE TABLE IF NOT EXISTS unresolved_flights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      message_hash TEXT NOT NULL,
      reason_codes TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      subject TEXT,
      body_snippet TEXT,
      message_id TEXT,
      received_at TIMESTAMPTZ,
      airline TEXT,
      flight_number TEXT,
      from_iata TEXT,
      to_iata TEXT,
      departure_date TIMESTAMPTZ,
      raw_payload JSONB,
      resolved_flight_id TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, source, message_hash)
    );

    CREATE INDEX IF NOT EXISTS flights_user_idx ON flights(user_id, departure_date DESC);
    CREATE INDEX IF NOT EXISTS unresolved_user_status_idx
      ON unresolved_flights(user_id, status, created_at DESC);
  `);
  await migrateFlightDedupSchema();
}

/** One flight per user even if booking + check-in + delay emails share the same segment. */
async function migrateFlightDedupSchema() {
  await pool.query(`ALTER TABLE flights ADD COLUMN IF NOT EXISTS dedup_key TEXT`);

  const { rows } = await pool.query(
    `SELECT id, user_id, dedup_key, airline, flight_number, from_iata, to_iata, departure_date
     FROM flights`,
  );
  for (const row of rows) {
    const key = computeFlightDedupKey(row.user_id, row);
    if (row.dedup_key !== key) {
      await pool.query(`UPDATE flights SET dedup_key = $1 WHERE id = $2`, [key, row.id]);
    }
  }

  await pool.query(`
    DELETE FROM flights
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY user_id, dedup_key
            ORDER BY created_at ASC NULLS LAST, id ASC
          ) AS rn
        FROM flights
        WHERE dedup_key IS NOT NULL
      ) t
      WHERE rn > 1
    )
  `);

  /** Garbage-only duplicates (e.g. three XX rows for one segment) without touching mixed carrier groups. */
  await pool.query(`
    DELETE FROM flights
    WHERE id IN (
      SELECT id FROM (
        SELECT f.id,
          ROW_NUMBER() OVER (
            PARTITION BY f.user_id, f.from_iata, f.to_iata,
              date_trunc('minute', f.departure_date)
            ORDER BY length(f.flight_number) DESC, f.created_at ASC, f.id ASC
          ) AS rn
        FROM flights f
        INNER JOIN (
          SELECT user_id, from_iata, to_iata, date_trunc('minute', departure_date) AS slot
          FROM flights
          GROUP BY user_id, from_iata, to_iata, date_trunc('minute', departure_date)
          HAVING COUNT(*) > 1 AND bool_and(upper(airline) IN ('XX', 'UN'))
        ) x
          ON f.user_id = x.user_id
          AND f.from_iata = x.from_iata
          AND f.to_iata = x.to_iata
          AND date_trunc('minute', f.departure_date) = x.slot
      ) t
      WHERE rn > 1
    )
  `);

  await pool.query(
    `ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_user_id_source_message_hash_key`,
  );

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS flights_user_dedup_idx ON flights (user_id, dedup_key)
  `);

  await pool.query(`ALTER TABLE flights ALTER COLUMN dedup_key SET NOT NULL`);
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
  const dedupKey = computeFlightDedupKey(userId, flight);
  const subjectForNearDup = String(rawPayload?.subject || flight.raw_subject || '');
  if (shouldNearDedupBySubject(subjectForNearDup)) {
    const designator = flightDesignator(flight.flight_number, flight.airline);
    const nearDup = await pool.query(
      `
        SELECT id
        FROM flights
        WHERE user_id = $1
          AND from_iata = $2
          AND to_iata = $3
          AND regexp_replace(upper(flight_number), '\s+', '', 'g') = $4
          AND ABS(EXTRACT(EPOCH FROM (departure_date - $5::timestamptz))) <= 172800
        LIMIT 1
      `,
      [userId, flight.from_iata, flight.to_iata, designator, flight.departure_date],
    );
    if (nearDup.rowCount > 0) return false;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO flights (
        id, user_id, source, message_hash, dedup_key, airline, flight_number, from_iata, to_iata,
        departure_date, duration_min, price, currency, cabin, raw_subject, raw_payload
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (user_id, dedup_key) DO NOTHING
      RETURNING id
    `,
    [
      id,
      userId,
      source,
      messageHash,
      dedupKey,
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

export async function storeUnresolvedFlight(userId, source, messageHash, unresolved, rawPayload) {
  if (!unresolved) return false;
  const id = crypto.randomUUID();
  const reasonCodes = Array.isArray(unresolved.reason_codes) ? unresolved.reason_codes : [];
  const { rows } = await pool.query(
    `
      INSERT INTO unresolved_flights (
        id, user_id, source, message_hash, reason_codes, status, subject, body_snippet, message_id,
        received_at, airline, flight_number, from_iata, to_iata, departure_date, raw_payload
      )
      VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (user_id, source, message_hash)
      DO UPDATE SET
        reason_codes = EXCLUDED.reason_codes,
        status = 'pending',
        subject = EXCLUDED.subject,
        body_snippet = EXCLUDED.body_snippet,
        message_id = EXCLUDED.message_id,
        received_at = EXCLUDED.received_at,
        airline = EXCLUDED.airline,
        flight_number = EXCLUDED.flight_number,
        from_iata = EXCLUDED.from_iata,
        to_iata = EXCLUDED.to_iata,
        departure_date = EXCLUDED.departure_date,
        raw_payload = EXCLUDED.raw_payload,
        resolved_flight_id = NULL,
        resolved_at = NULL
      RETURNING id
    `,
    [
      id,
      userId,
      source,
      messageHash,
      reasonCodes,
      unresolved.subject || null,
      unresolved.body_snippet || null,
      unresolved.message_id || null,
      unresolved.received_at || null,
      unresolved.airline || null,
      unresolved.flight_number || null,
      unresolved.from_iata || null,
      unresolved.to_iata || null,
      unresolved.departure_date || null,
      rawPayload || null,
    ],
  );
  return Boolean(rows[0]);
}

export async function listUnresolvedFlights(userId, source) {
  const params = [userId, 'pending'];
  let where = 'user_id = $1 AND status = $2';
  if (source) {
    params.push(source);
    where += ` AND source = $${params.length}`;
  }
  const { rows } = await pool.query(
    `
      SELECT
        id,
        source,
        reason_codes,
        subject,
        body_snippet,
        message_id,
        received_at,
        airline,
        flight_number,
        from_iata,
        to_iata,
        departure_date,
        raw_payload,
        created_at
      FROM unresolved_flights
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT 120
    `,
    params,
  );
  return rows;
}

export async function ignoreUnresolvedFlight(userId, unresolvedId) {
  const { rowCount } = await pool.query(
    `
      UPDATE unresolved_flights
      SET status = 'ignored', resolved_at = now()
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
    `,
    [unresolvedId, userId],
  );
  return rowCount > 0;
}

export async function resolveUnresolvedFlight(userId, unresolvedId, patch = {}) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM unresolved_flights
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      LIMIT 1
    `,
    [unresolvedId, userId],
  );
  const item = rows[0];
  if (!item) throw new Error('Unresolved ticket not found');

  const airline = String(patch.airline || item.airline || '')
    .trim()
    .toUpperCase();
  const fromIata = String(patch.from_iata || item.from_iata || '')
    .trim()
    .toUpperCase();
  const toIata = String(patch.to_iata || item.to_iata || '')
    .trim()
    .toUpperCase();
  const dateValue = patch.departure_date || item.departure_date;

  if (!/^[A-Z0-9]{2}$/.test(airline) || /^\d{2}$/.test(airline)) {
    throw new Error('Airline must be a valid 2-char IATA carrier code');
  }
  if (!/^[A-Z]{3}$/.test(fromIata) || !/^[A-Z]{3}$/.test(toIata)) {
    throw new Error('Route must contain valid IATA airport codes');
  }
  const departureDate = new Date(dateValue);
  if (Number.isNaN(departureDate.getTime())) {
    throw new Error('Departure date is required');
  }

  const designator = flightDesignator(
    patch.flight_number || item.flight_number || '',
    airline,
  );
  const m = designator.match(/^([A-Z0-9]{2})(\d{1,4})$/);
  if (!m) throw new Error('Flight number is required');
  const flightNumber = `${m[1]} ${m[2]}`;

  const flight = {
    id: crypto.randomUUID(),
    airline,
    flight_number: flightNumber,
    from_iata: fromIata,
    to_iata: toIata,
    departure_date: departureDate.toISOString(),
    duration_min: null,
    price: null,
    currency: 'USD',
    cabin: 'economy',
    raw_subject: item.subject || 'Manual review',
  };

  await storeFlight(userId, item.source, item.message_hash, flight, {
    ...(item.raw_payload || {}),
    manualResolution: true,
    unresolvedId: item.id,
  });

  await pool.query(
    `
      UPDATE unresolved_flights
      SET status = 'resolved', resolved_at = now()
      WHERE id = $1 AND user_id = $2
    `,
    [item.id, userId],
  );
  return true;
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
        raw_subject,
        raw_payload
      FROM flights
      WHERE ${where}
      ORDER BY departure_date DESC
    `,
    params,
  );
  return rows;
}

function shouldNearDedupBySubject(subject) {
  const s = String(subject || '').toLowerCase();
  return /\b(check-?in|boarding pass|reminder|time to fly|ready to fly|online check)\b/.test(s);
}
