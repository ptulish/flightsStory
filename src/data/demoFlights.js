// Demo flight history — about 5 years of travel for a fictional user.
// Designed to populate every dashboard feature: many countries, many airlines,
// short-haul + long-haul mix, business and leisure routes.
// Prices in original currency; converted at display time.

export const DEMO_USER = {
  name: 'Alex Sky',
  email: 'demo@skyhistory.app',
  joined: '2021-01-01',
  homeIata: 'SVO',
};

const f = (id, date, airline, num, from, to, price, currency, opts = {}) => ({
  id,
  airline,
  flight_number: `${airline} ${num}`,
  from_iata: from,
  to_iata: to,
  departure_date: date,
  duration_min: opts.duration ?? null,
  price,
  currency,
  cabin: opts.cabin || 'economy',
  source: opts.source || 'gmail',
  raw_subject: opts.subject || `Your e-ticket: ${from} → ${to}`,
});

export const DEMO_FLIGHTS = [
  // 2021 — pandemic era, mostly domestic
  f('1', '2021-02-12T08:30', 'SU', '1140', 'SVO', 'LED', 5200, 'RUB', { duration: 95, subject: 'Aeroflot e-ticket SVO→LED' }),
  f('2', '2021-02-15T19:10', 'SU', '1145', 'LED', 'SVO', 4800, 'RUB', { duration: 100 }),
  f('3', '2021-06-18T07:00', 'S7', '1009', 'DME', 'AER', 7400, 'RUB', { duration: 145, subject: 'S7 itinerary' }),
  f('4', '2021-06-25T14:20', 'S7', '1014', 'AER', 'DME', 6900, 'RUB', { duration: 150 }),
  f('5', '2021-09-04T10:15', 'U6', '281', 'DME', 'KZN', 5600, 'RUB', { duration: 90 }),
  f('6', '2021-09-07T18:30', 'U6', '282', 'KZN', 'DME', 5300, 'RUB', { duration: 95 }),
  f('7', '2021-12-22T22:30', 'TK', '414', 'SVO', 'IST', 18900, 'RUB', { duration: 195, cabin: 'economy', subject: 'Turkish Airlines E-Ticket' }),
  f('8', '2021-12-22T05:15', 'TK', '79', 'IST', 'AYT', 4200, 'RUB', { duration: 70 }),
  f('9', '2022-01-04T11:45', 'PC', '714', 'AYT', 'SAW', 3800, 'RUB', { duration: 75 }),
  f('10', '2022-01-04T18:20', 'TK', '413', 'IST', 'SVO', 17600, 'RUB', { duration: 200 }),

  // 2022 — recovery, more variety
  f('11', '2022-04-09T07:40', 'SU', '1851', 'SVO', 'TBS', 22400, 'RUB', { duration: 200 }),
  f('12', '2022-04-13T20:55', 'SU', '1852', 'TBS', 'SVO', 21100, 'RUB', { duration: 195 }),
  f('13', '2022-05-21T16:20', 'TK', '417', 'SVO', 'IST', 27800, 'RUB', { duration: 210 }),
  f('14', '2022-05-21T22:55', 'TK', '67', 'IST', 'JFK', 1090, 'USD', { duration: 600, cabin: 'economy', subject: 'Turkish Airlines IST-JFK' }),
  f('15', '2022-05-30T18:30', 'TK', '6', 'JFK', 'IST', 980, 'USD', { duration: 605 }),
  f('16', '2022-05-31T08:10', 'TK', '418', 'IST', 'SVO', 26200, 'RUB', { duration: 215 }),
  f('17', '2022-08-06T05:40', 'EK', '132', 'DME', 'DXB', 38400, 'RUB', { duration: 320, subject: 'Emirates Receipt' }),
  f('18', '2022-08-13T09:30', 'EK', '131', 'DXB', 'DME', 41200, 'RUB', { duration: 330 }),
  f('19', '2022-10-02T13:25', 'GS', '1', 'SVO', 'TBS', 19800, 'RUB', { duration: 195, source: 'gmail' }),
  f('20', '2022-10-08T07:50', 'GS', '2', 'TBS', 'SVO', 18200, 'RUB', { duration: 200 }),
  f('21', '2022-12-29T03:45', 'EK', '136', 'DME', 'DXB', 49200, 'RUB', { duration: 320, cabin: 'economy' }),
  f('22', '2023-01-06T22:10', 'EK', '135', 'DXB', 'DME', 51400, 'RUB', { duration: 335 }),

  // 2023 — heavy travel year, mix of work + leisure
  f('23', '2023-02-14T09:25', 'TK', '414', 'SVO', 'IST', 24900, 'RUB', { duration: 205 }),
  f('24', '2023-02-14T15:30', 'TK', '1789', 'IST', 'BCN', 215, 'EUR', { duration: 195 }),
  f('25', '2023-02-22T07:00', 'IB', '5256', 'BCN', 'MAD', 89, 'EUR', { duration: 85 }),
  f('26', '2023-02-22T14:00', 'TK', '1858', 'MAD', 'IST', 245, 'EUR', { duration: 245 }),
  f('27', '2023-02-22T22:55', 'TK', '413', 'IST', 'SVO', 23100, 'RUB', { duration: 210 }),
  f('28', '2023-04-15T08:30', 'SU', '1006', 'SVO', 'LED', 6100, 'RUB', { duration: 90, cabin: 'business' }),
  f('29', '2023-04-17T20:00', 'SU', '1011', 'LED', 'SVO', 5900, 'RUB', { duration: 95 }),
  f('30', '2023-06-04T05:10', 'QR', '232', 'DME', 'DOH', 510, 'USD', { duration: 290, subject: 'Qatar Airways e-ticket' }),
  f('31', '2023-06-04T08:25', 'QR', '964', 'DOH', 'MLE', 360, 'USD', { duration: 280 }),
  f('32', '2023-06-12T20:50', 'QR', '675', 'MLE', 'DOH', 385, 'USD', { duration: 290 }),
  f('33', '2023-06-13T02:25', 'QR', '231', 'DOH', 'DME', 530, 'USD', { duration: 295 }),
  f('34', '2023-08-19T22:00', 'TK', '414', 'SVO', 'IST', 28600, 'RUB', { duration: 205 }),
  f('35', '2023-08-20T07:15', 'TK', '1853', 'IST', 'LIS', 285, 'EUR', { duration: 290 }),
  f('36', '2023-08-27T14:00', 'TK', '1754', 'LIS', 'IST', 295, 'EUR', { duration: 300 }),
  f('37', '2023-08-27T22:30', 'TK', '413', 'IST', 'SVO', 27200, 'RUB', { duration: 210 }),
  f('38', '2023-10-12T14:00', 'S7', '1234', 'DME', 'AYT', 15000, 'RUB', { duration: 270, subject: 'S7 itinerary DME-AYT' }),
  f('39', '2023-10-19T18:30', 'S7', '1235', 'AYT', 'DME', 14200, 'RUB', { duration: 265 }),
  f('40', '2023-12-23T14:00', 'TK', '414', 'SVO', 'IST', 31200, 'RUB', { duration: 205 }),
  f('41', '2023-12-23T20:55', 'TK', '64', 'IST', 'BKK', 720, 'USD', { duration: 580 }),
  f('42', '2024-01-02T01:10', 'TG', '252', 'BKK', 'HKT', 95, 'USD', { duration: 80 }),
  f('43', '2024-01-08T14:00', 'TG', '253', 'HKT', 'BKK', 88, 'USD', { duration: 80 }),
  f('44', '2024-01-08T22:30', 'TK', '69', 'BKK', 'IST', 760, 'USD', { duration: 650 }),
  f('45', '2024-01-09T13:10', 'TK', '413', 'IST', 'SVO', 30200, 'RUB', { duration: 210 }),

  // 2024 — premium, long haul, more business
  f('46', '2024-03-09T09:40', 'SU', '1140', 'SVO', 'LED', 6300, 'RUB', { duration: 90, cabin: 'business' }),
  f('47', '2024-03-11T19:15', 'SU', '1145', 'LED', 'SVO', 6100, 'RUB', { duration: 95, cabin: 'business' }),
  f('48', '2024-04-21T22:30', 'TK', '414', 'SVO', 'IST', 33400, 'RUB', { duration: 205 }),
  f('49', '2024-04-22T08:20', 'TK', '1979', 'IST', 'AMS', 245, 'EUR', { duration: 215 }),
  f('50', '2024-04-22T18:10', 'KL', '1043', 'AMS', 'LHR', 165, 'EUR', { duration: 80 }),
  f('51', '2024-04-29T07:30', 'BA', '442', 'LHR', 'AMS', 175, 'GBP', { duration: 80 }),
  f('52', '2024-04-29T13:10', 'KL', '901', 'AMS', 'IST', 235, 'EUR', { duration: 215 }),
  f('53', '2024-04-29T22:45', 'TK', '413', 'IST', 'SVO', 32800, 'RUB', { duration: 210 }),
  f('54', '2024-07-08T03:20', 'EK', '132', 'DME', 'DXB', 64200, 'RUB', { duration: 320, cabin: 'business', subject: 'Emirates Business Class Ticket' }),
  f('55', '2024-07-08T09:55', 'EK', '354', 'DXB', 'SIN', 1240, 'USD', { duration: 425, cabin: 'business' }),
  f('56', '2024-07-15T01:35', 'SQ', '286', 'SIN', 'HND', 980, 'USD', { duration: 410 }),
  f('57', '2024-07-22T11:25', 'JL', '5', 'HND', 'HKG', 720, 'USD', { duration: 295 }),
  f('58', '2024-07-26T15:50', 'EK', '385', 'HKG', 'DXB', 790, 'USD', { duration: 510 }),
  f('59', '2024-07-26T22:25', 'EK', '131', 'DXB', 'DME', 56800, 'RUB', { duration: 335 }),
  f('60', '2024-09-13T08:15', 'SU', '1006', 'SVO', 'LED', 7200, 'RUB', { duration: 90 }),
  f('61', '2024-09-15T20:40', 'SU', '1011', 'LED', 'SVO', 6900, 'RUB', { duration: 95 }),
  f('62', '2024-11-02T05:30', 'EK', '136', 'DME', 'DXB', 71200, 'RUB', { duration: 320 }),
  f('63', '2024-11-09T22:55', 'EK', '135', 'DXB', 'DME', 73600, 'RUB', { duration: 335 }),

  // 2025 — most recent
  f('64', '2025-02-08T22:30', 'TK', '414', 'SVO', 'IST', 36800, 'RUB', { duration: 205 }),
  f('65', '2025-02-09T07:55', 'TK', '1', 'IST', 'JFK', 1240, 'USD', { duration: 600, cabin: 'business' }),
  f('66', '2025-02-09T14:00', 'AA', '301', 'JFK', 'LAX', 320, 'USD', { duration: 365 }),
  f('67', '2025-02-18T22:55', 'AA', '32', 'LAX', 'JFK', 295, 'USD', { duration: 320 }),
  f('68', '2025-02-19T18:30', 'TK', '6', 'JFK', 'IST', 1180, 'USD', { duration: 605 }),
  f('69', '2025-02-20T08:10', 'TK', '413', 'IST', 'SVO', 35600, 'RUB', { duration: 210 }),
  f('70', '2025-04-05T11:20', 'S7', '1009', 'DME', 'AER', 8400, 'RUB', { duration: 145 }),
  f('71', '2025-04-12T14:20', 'S7', '1014', 'AER', 'DME', 7900, 'RUB', { duration: 150 }),
  f('72', '2025-06-22T08:10', 'SU', '1851', 'SVO', 'TBS', 28900, 'RUB', { duration: 200 }),
  f('73', '2025-06-22T15:30', 'A9', '107', 'TBS', 'EVN', 8200, 'RUB', { duration: 90 }),
  f('74', '2025-06-29T18:10', 'A9', '108', 'EVN', 'TBS', 7900, 'RUB', { duration: 90 }),
  f('75', '2025-06-29T22:50', 'SU', '1852', 'TBS', 'SVO', 27600, 'RUB', { duration: 195 }),
  f('76', '2025-09-15T06:45', 'EK', '132', 'DME', 'DXB', 68400, 'RUB', { duration: 320 }),
  f('77', '2025-09-15T13:55', 'EK', '650', 'DXB', 'DPS', 1380, 'USD', { duration: 535, cabin: 'business' }),
  f('78', '2025-09-26T18:25', 'EK', '399', 'DPS', 'DXB', 1280, 'USD', { duration: 555 }),
  f('79', '2025-09-27T03:10', 'EK', '131', 'DXB', 'DME', 71800, 'RUB', { duration: 335 }),
];

// Approximate exchange rates → USD (for total spend cards in demo).
export const FX_RATES = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  RUB: 0.011,
  JPY: 0.0067,
  AED: 0.27,
};
