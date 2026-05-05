const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/postgres');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/franchisees', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users, tasks, completions] = await Promise.all([
      db.getUsers(), db.getTasks(), db.getAllCompletions()
    ]);
    const franchisees = users.filter(u => u.role === 'franchisee').map(u => {
      const done = completions.filter(c => c.userId === u.id).length;
      const total = tasks.length;
      const { password, resetToken, resetExpires, ...safe } = u;
      return { ...safe, completedCount: done, totalCount: total, pct: total ? Math.round((done/total)*100) : 0 };
    });
    res.json(franchisees);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/franchisees/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user || user.role !== 'franchisee') return res.status(404).json({ error: 'Not found' });
    const { password, resetToken, resetExpires, ...safe } = user;
    res.json(safe);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/seed', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== (process.env.SEED_SECRET || 'puregreenadmin2024'))
      return res.status(403).json({ error: 'Forbidden' });
    const exists = await db.adminExists();
    if (exists) return res.json({ message: 'Admin already exists' });
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'PureGreenAdmin2024!', 10);
    await db.createUser({
      id: uuidv4(), role: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@puregreen.com',
      password: hash, storeName: 'Corporate', storeAddress: '',
      ownerName: 'Admin', plannedOpenDate: '',
      createdAt: new Date().toISOString()
    });
    await db.seedTasksIfEmpty();
    res.json({ success: true, message: 'Admin account created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Seed failed' }); }
});

module.exports = router;

// ── Admin Internal Tasks ──────────────────────────────────

// Get all internal admin tasks for a franchisee
router.get('/franchisees/:id/admin-tasks', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tasks = await db.getAdminTasks(req.params.id);
    res.json(tasks);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Create a new internal admin task for a franchisee
router.post('/franchisees/:id/admin-tasks', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { platform, title } = req.body;
    if (!platform || !title) return res.status(400).json({ error: 'Platform and title required' });
    const { v4: uuidv4 } = require('uuid');
    const task = {
      id: 'at-' + uuidv4().slice(0, 8),
      franchiseeId: req.params.id,
      platform, title,
      createdAt: new Date().toISOString(),
      createdBy: req.user.email
    };
    await db.createAdminTask(task);
    res.json({ success: true, task });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Toggle admin task complete/incomplete
router.patch('/admin-tasks/:taskId/toggle', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.toggleAdminTask(req.params.taskId, req.body.completed);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Delete admin task
router.delete('/admin-tasks/:taskId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.deleteAdminTask(req.params.taskId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
