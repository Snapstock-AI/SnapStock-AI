// Seeds the performance database and writes .generated/seed.json (credentials for k6).
//   node tools/seed.mjs                 50 vendors, one business/shelf/product each (functional load tests)
//   node tools/seed.mjs --users=100     more vendors (needed for SCAN_CONCURRENCY=50 and above)
//   node tools/seed.mjs --capacity      SRS capacity volume (NFR-PERF-003):
//                                       100 businesses, 500 users, 50,000 scans, 500,000 detections
// Only ever writes to a database whose name ends in _test.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { databaseUrl, generatedDir, root } from './stack.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const capacity = Boolean(args.capacity);
const businesses = capacity ? 100 : Number(args.users || 50);
const employees = capacity ? 400 : 0;
const scansPerBusiness = capacity ? 500 : 0; // 100 x 500 = 50,000
const detectionsPerScan = 10; // 50,000 x 10 = 500,000
const PASSWORD = 'Perf2024x';
const PRODUCTS = ['apple', 'banana', 'orange', 'lemon', 'tomato', 'potato', 'carrot', 'mango', 'grape', 'pear'];

export async function seed(dbUrl = databaseUrl()) {
  const bcrypt = createRequire(path.join(root, 'server/package.json'))('bcrypt');
  const hash = await bcrypt.hash(PASSWORD, 10);
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  const started = Date.now();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (full_name, email, password_hash, email_verified)
       SELECT 'Perf Owner ' || g, 'perf-owner-' || g || '@example.test', $1, TRUE FROM generate_series(1, $2) g`,
      [hash, businesses],
    );
    await client.query(
      `INSERT INTO businesses (business_name, business_email, address, contact_number, low_stock_threshold)
       SELECT 'Perf Store ' || g, 'perf-store-' || g || '@example.test', 'Address ' || g, '0771234567', 25 FROM generate_series(1, $1) g`,
      [businesses],
    );
    await client.query(
      `INSERT INTO business_users (business_id, user_id, role)
       SELECT b.id, u.id, 'OWNER'
       FROM (SELECT id, row_number() OVER (ORDER BY business_name) rn FROM businesses WHERE business_name LIKE 'Perf Store %') b
       JOIN (SELECT id, row_number() OVER (ORDER BY email) rn FROM users WHERE email LIKE 'perf-owner-%') u ON u.rn = b.rn`,
    );
    if (employees) {
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, email_verified)
         SELECT 'Perf Employee ' || g, 'perf-employee-' || g || '@example.test', $1, TRUE FROM generate_series(1, $2) g`,
        [hash, employees],
      );
      await client.query(
        `INSERT INTO business_users (business_id, user_id, role)
         SELECT b.id, e.id, 'EMPLOYEE'
         FROM (SELECT id, row_number() OVER (ORDER BY id) rn FROM businesses WHERE business_name LIKE 'Perf Store %') b
         JOIN (SELECT id, row_number() OVER (ORDER BY email) rn FROM users WHERE email LIKE 'perf-employee-%') e
           ON ((e.rn - 1) % $1) + 1 = b.rn`,
        [businesses],
      );
    }
    await client.query(
      `INSERT INTO shelves (business_id, name, category)
       SELECT b.id, 'Shelf ' || s, 'Fruit' FROM businesses b CROSS JOIN generate_series(1, $1) s WHERE b.business_name LIKE 'Perf Store %'`,
      [capacity ? 5 : 1],
    );
    await client.query(
      `INSERT INTO products (business_id, name, quantity, low_stock_threshold)
       SELECT b.id, p.name, 100, 0 FROM businesses b CROSS JOIN unnest($1::text[]) AS p(name) WHERE b.business_name LIKE 'Perf Store %'`,
      [capacity ? PRODUCTS : ['apple']],
    );
    if (capacity) {
      await client.query(
        `INSERT INTO scans (business_id, shelf_id, user_id, status, scan_mode, created_at, completed_at)
         SELECT s.business_id, s.id, bu.user_id, 'COMPLETED', 'STOCK_IN',
                NOW() - random() * INTERVAL '7 days', NOW()
         FROM shelves s
         JOIN business_users bu ON bu.business_id = s.business_id AND bu.role = 'OWNER'
         CROSS JOIN generate_series(1, $1) n`,
        [Math.ceil(scansPerBusiness / 5)],
      );
      await client.query(
        `INSERT INTO detections (scan_id, product_label, product_id, confidence, freshness, freshness_confidence, created_at)
         SELECT sc.id, p.name, p.id, 0.5 + random() * 0.5,
                ((ARRAY['Fresh','Medium','Spoiled'])[1 + floor(random() * 3)::int])::freshness_status, 0.6 + random() * 0.4, sc.created_at
         FROM scans sc JOIN products p ON p.business_id = sc.business_id`,
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  const owners = await client.query(
    `SELECT u.email, b.id AS "businessId", (SELECT id FROM shelves WHERE business_id = b.id ORDER BY name LIMIT 1) AS "shelfId"
     FROM businesses b
     JOIN business_users bu ON bu.business_id = b.id AND bu.role = 'OWNER'
     JOIN users u ON u.id = bu.user_id
     WHERE b.business_name LIKE 'Perf Store %' ORDER BY b.business_name`,
  );
  const counts = {};
  for (const table of ['users', 'businesses', 'scans', 'detections']) {
    counts[table] = Number((await client.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
  }
  await client.end();

  fs.mkdirSync(generatedDir, { recursive: true });
  const users = owners.rows.map((row) => ({ ...row, password: PASSWORD }));
  fs.writeFileSync(path.join(generatedDir, 'seed.json'), JSON.stringify({ mode: capacity ? 'capacity' : 'functional', counts, users }, null, 1));
  return { counts, seconds: (Date.now() - started) / 1000 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().then(
    ({ counts, seconds }) => console.log(`Seeded in ${seconds.toFixed(1)}s:`, counts),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
