const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host:     process.env.DB_HOST     || 'user-db',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'userdb',
      user:     process.env.DB_USER     || 'admin',
      password: process.env.DB_PASSWORD || 'secret',
    });

module.exports = { pool };
