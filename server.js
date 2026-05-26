require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { query } = require('./src/db');
const initDb = require('./src/initDb');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Please login first.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'You are not allowed to access this page.' });
      }
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Your login session expired. Please login again.' });
    }
  };
}

function cleanText(value, fallback = '') {
  return String(value || fallback).trim();
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(selected.getTime()) && selected >= today;
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1 AS ok');
    res.json({ ok: true, app: "Ruthy's Eatery Booking System" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const fullName = cleanText(req.body.fullName);
  const email = cleanText(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const phone = cleanText(req.body.phone);

  if (!fullName || fullName.length < 2) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const hash = await bcrypt.hash(password, 12);
  await query(
    'INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
    [fullName, email, hash, 'customer', phone]
  );

  res.status(201).json({ message: 'Customer account created. You can now login.' });
});

app.post('/api/auth/login', async (req, res) => {
  const email = cleanText(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const expectedRole = cleanText(req.body.role);

  if (!validator.isEmail(email) || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (expectedRole && user.role !== expectedRole) {
    return res.status(403).json({ error: `This account is not a ${expectedRole} account.` });
  }

  res.json({
    message: 'Login successful.',
    token: createToken(user),
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone
    }
  });
});

app.get('/api/menu', async (req, res) => {
  const rows = await query('SELECT id, name, description, price, is_available FROM menu_items ORDER BY name');
  res.json({ rows });
});

app.get('/api/customer/me', auth('customer'), async (req, res) => {
  const rows = await query('SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = ? LIMIT 1', [req.user.id]);
  res.json({ user: rows[0] });
});

app.get('/api/customer/bookings', auth('customer'), async (req, res) => {
  const rows = await query(
    `SELECT id, reservation_date, reservation_time, guest_count, phone, special_request, status, created_at
     FROM reservations
     WHERE user_id = ?
     ORDER BY reservation_date DESC, reservation_time DESC`,
    [req.user.id]
  );
  res.json({ rows });
});

app.post('/api/customer/bookings', auth('customer'), async (req, res) => {
  const reservationDate = cleanText(req.body.reservationDate);
  const reservationTime = cleanText(req.body.reservationTime);
  const guestCount = Number(req.body.guestCount);
  const phone = cleanText(req.body.phone);
  const specialRequest = cleanText(req.body.specialRequest);

  if (!isValidDate(reservationDate)) {
    return res.status(400).json({ error: 'Booking date must be today or a future date.' });
  }

  if (!isValidTime(reservationTime)) {
    return res.status(400).json({ error: 'Please select a valid booking time.' });
  }

  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 50) {
    return res.status(400).json({ error: 'Guest count must be from 1 to 50.' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const duplicate = await query(
    `SELECT id FROM reservations
     WHERE user_id = ? AND reservation_date = ? AND reservation_time = ? AND status IN ('pending','confirmed')
     LIMIT 1`,
    [req.user.id, reservationDate, reservationTime]
  );

  if (duplicate.length > 0) {
    return res.status(409).json({ error: 'You already have an active booking for this date and time.' });
  }

  await query(
    `INSERT INTO reservations (user_id, reservation_date, reservation_time, guest_count, phone, special_request)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, reservationDate, reservationTime, guestCount, phone, specialRequest]
  );

  res.status(201).json({ message: 'Booking submitted. Please wait for admin confirmation.' });
});

app.patch('/api/customer/bookings/:id/cancel', auth('customer'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const result = await query(
    `UPDATE reservations SET status = 'cancelled'
     WHERE id = ? AND user_id = ? AND status IN ('pending','confirmed')`,
    [bookingId, req.user.id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Booking was not found or cannot be cancelled.' });
  }

  res.json({ message: 'Booking cancelled.' });
});

app.get('/api/admin/dashboard', auth('admin'), async (req, res) => {
  const totals = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'pending') AS pending,
      SUM(status = 'confirmed') AS confirmed,
      SUM(status = 'completed') AS completed,
      SUM(status = 'cancelled') AS cancelled
    FROM reservations
  `);

  const upcoming = await query(`
    SELECT r.id, r.reservation_date, r.reservation_time, r.guest_count, r.status,
           u.full_name, u.email, r.phone
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    WHERE r.status IN ('pending','confirmed') AND r.reservation_date >= CURDATE()
    ORDER BY r.reservation_date ASC, r.reservation_time ASC
    LIMIT 5
  `);

  const customers = await query(`SELECT COUNT(*) AS total_customers FROM users WHERE role = 'customer'`);

  res.json({
    stats: {
      total: Number(totals[0].total || 0),
      pending: Number(totals[0].pending || 0),
      confirmed: Number(totals[0].confirmed || 0),
      completed: Number(totals[0].completed || 0),
      cancelled: Number(totals[0].cancelled || 0),
      customers: Number(customers[0].total_customers || 0)
    },
    upcoming
  });
});

app.get('/api/admin/bookings', auth('admin'), async (req, res) => {
  const status = cleanText(req.query.status);
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  const where = allowed.includes(status) ? 'WHERE r.status = ?' : '';
  const params = allowed.includes(status) ? [status] : [];

  const rows = await query(
    `SELECT r.id, r.reservation_date, r.reservation_time, r.guest_count, r.phone,
            r.special_request, r.status, r.created_at, r.updated_at,
            u.full_name, u.email
     FROM reservations r
     JOIN users u ON u.id = r.user_id
     ${where}
     ORDER BY r.reservation_date DESC, r.reservation_time DESC`,
    params
  );

  res.json({ rows });
});

app.patch('/api/admin/bookings/:id/status', auth('admin'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const status = cleanText(req.body.status);
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status.' });
  }

  const result = await query('UPDATE reservations SET status = ? WHERE id = ?', [status, bookingId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  res.json({ message: `Booking marked as ${status}.` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  try {
    if (String(process.env.AUTO_MIGRATE || 'true').toLowerCase() === 'true') {
      await initDb();
    }

    app.listen(PORT, () => {
      console.log(`Ruthy's Eatery Booking System running on port ${PORT}`);
    });
  } catch (error) {
    console.error('server failed to start:', error);
    process.exit(1);
  }
}

start();
