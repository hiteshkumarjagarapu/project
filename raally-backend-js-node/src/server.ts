/**
 * Starts the application on the port specified.
 */
/*require('dotenv').config();

import _ from './services/_'; _();
import api from './api';

const PORT = process.env.PORT || 8080;

api.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});


*/

require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
app.use(express.json());  // To parse JSON requests

// Database setup
const db = new sqlite3.Database('./raally.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create users table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    password TEXT NOT NULL,
    active INTEGER,
    email TEXT,
    created_at TEXT,
    updated_at TEXT,
    last_login TEXT
  )
`);

// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// CRUD Operations

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, role, email, active, created_at, updated_at, last_login FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ users: rows });
  });
});

// Create a new user (Sign Up)
app.post('/api/users', async (req, res) => {
  const { id, username, role, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO users (id, username, role, password, active, email, created_at, updated_at) 
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    [id, username, role, hashedPassword, email, createdAt, createdAt],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: id });
    }
  );
});

// Update user password
app.put('/api/users/:id', async (req, res) => {
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const updatedAt = new Date().toISOString();
  
  db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [hashedPassword, updatedAt, req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ updatedID: req.params.id });
  });
});

// Delete a user
app.delete('/api/users/:id', (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ deletedID: req.params.id });
  });
});

// Authentication: Sign-In
app.post('/api/auth/sign-in', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update last login time
    const lastLogin = new Date().toISOString();
    db.run('UPDATE users SET last_login = ? WHERE id = ?', [lastLogin, user.id]);

    // Generate JWT token
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});


