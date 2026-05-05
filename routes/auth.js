const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/postgres');
const { sendNewFranchiseeAlert, sendPasswordResetEmail } = require('../utils/mailer');

const SECRET = process.env.JWT_SECRET || 'puregreen-secret-2024';

router.post('/register', async (req, res) => {
  try {
    const { storeName, storeAddress, ownerName, plannedOpenDate, email, password } = req.body;
    if (!storeName || !storeAddress || !ownerName || !plannedOpenDate || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(), role: 'franchisee',
      storeName, storeAddress, ownerName, plannedOpenDate,
      email: email.toLowerCase(), password: hash,
      createdAt: new Date().toISOString()
    };
    await db.createUser(user);
    sendNewFranchiseeAlert(user).catch(e => console.error('Email failed:', e));

    const token = jwt.sign({ id: user.id, role: 'franchisee', email: user.email }, SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, redirect: '/dashboard.html' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, redirect: user.role === 'admin' ? '/admin.html' : '/dashboard.html' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) return res.json({ success: true });
    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.setResetToken(user.id, token, expires);
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password.html?token=${token}`;
    sendPasswordResetEmail(user.email, resetUrl).catch(e => console.error('Reset email failed:', e));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await db.getUserByResetToken(token);
    if (!user || new Date(user.resetExpires) < new Date())
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    const hash = await bcrypt.hash(password, 10);
    await db.updateUserPassword(user.id, hash);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, SECRET);
    db.getUserById(decoded.id).then(user => {
      if (!user) return res.json({ user: null });
      const { password, resetToken, resetExpires, ...safe } = user;
      res.json({ user: safe });
    });
  } catch {
    res.json({ user: null });
  }
});

module.exports = router;
