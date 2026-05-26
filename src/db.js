// src/db.js
const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: 'mysql-16fbe6d8-ruthyseatery12.l.aivencloud.com',
      port: 28811,
      user: 'avnadmin',
      password: 'AVNS_b_GwzztL-Efn3ph3zyE',
      database: 'defaultdb',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false } // required for aiven
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };
