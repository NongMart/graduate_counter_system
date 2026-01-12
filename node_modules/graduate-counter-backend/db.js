const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',          // ชื่อ user
  host: 'localhost',
  database: 'grad_counter',  // ชื่อ database
  password: '700120',          // password ตอนติดตั้ง
  port: 5432,
});

module.exports = { pool };
