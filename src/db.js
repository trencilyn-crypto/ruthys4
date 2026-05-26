// src/db.js
const mysql = require('mysql2/promise');

let pool;

function getDbConfig() {
  const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';

  if (process.env.DATABASE_URL) {
    // use full DATABASE_URL from environment (aiven)
    const config = {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: false
    };

    if (sslEnabled) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  // fallback to individual env vars
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false
  };

  if (sslEnabled) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

function getPool() {
  if (!pool) {
    const config = getDbConfig();

    if (config.uri) {
      // mysql2 does not directly support 'uri' in createPool, parse it
      const mysqlUrl = new URL(config.uri);
      pool = mysql.createPool({
        host: mysqlUrl.hostname,
        port: Number(mysqlUrl.port),
        user: mysqlUrl.username,
        password: decodeURIComponent(mysqlUrl.password),
        database: mysqlUrl.pathname.replace(/^\//, ''),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: false,
        ssl: config.ssl
      });
    } else {
      pool = mysql.createPool(config);
    }
  }

  return pool;
}

/**
 * execute a query
 * @param {string} sql - sql query
 * @param {Array} params - query params
 * @returns {Promise<Array>} - rows
 */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };
