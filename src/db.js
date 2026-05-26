const db = require('./src/db');

async function initDb() {
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('customer','admin') DEFAULT 'customer'
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    date DATE,
    time TIME,
    people INT,
    status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  console.log('Tables created or exist already');
}
