# Ruthy's Eatery Booking System

A complete booking system for Ruthy's Eatery with customer login, admin login, table reservations, and admin booking management.

## Features

- Customer registration and login
- Admin login
- Customer table booking form
- Customer booking history and cancellation
- Admin dashboard with booking statistics
- Admin booking status update: pending, confirmed, completed, cancelled
- MySQL database using Aiven or local MySQL Workbench
- Ready for GitHub and Render deployment

## Tech Stack

- Node.js
- Express.js
- MySQL / Aiven for MySQL
- HTML, CSS, JavaScript
- JWT authentication
- bcrypt password hashing

## Default Admin Account

The app creates this account automatically when `AUTO_MIGRATE=true`:

```txt
email: admin@ruthys.com
password: admin12345
```

Change this in Render environment variables before deploying:

```txt
ADMIN_EMAIL=youradmin@email.com
ADMIN_PASSWORD=your-strong-password
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the sample environment file:

```bash
cp .env.example .env
```

3. Edit `.env` and add your database credentials.

Using Aiven Service URI:

```txt
DATABASE_URL=mysql://avnadmin:password@host.aivencloud.com:12345/defaultdb
DB_SSL=true
```

Using local MySQL:

```txt
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=ruthys_eatery
DB_SSL=false
```

4. Start the app:

```bash
npm start
```

Open:

```txt
http://localhost:3000
```

## Render Deployment

Use these Render settings:

```txt
Build Command: npm install
Start Command: npm start
```

Add these environment variables in Render:

```txt
NODE_VERSION=20.18.0
NODE_ENV=production
DATABASE_URL=your-aiven-service-uri
DB_SSL=true
JWT_SECRET=make-this-long-and-random
AUTO_MIGRATE=true
ADMIN_NAME=Ruthy's Admin
ADMIN_EMAIL=admin@ruthys.com
ADMIN_PASSWORD=change-this-password
```

## GitHub Upload Commands

```bash
git init
git add .
git commit -m "initial ruthys eatery booking system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## Database Tables

The app automatically creates these tables:

- users
- menu_items
- reservations

You can also open `sql/schema.sql` in MySQL Workbench if you want to view or manually run the database structure.
