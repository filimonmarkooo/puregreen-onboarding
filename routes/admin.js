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
    if (secret !== process.env.SEED_SECRET)
      return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
      return res.status(400).json({ error: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables' });
    const exists = await db.adminExists();
    if (exists) return res.json({ message: 'Admin already exists' });
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await db.createUser({
      id: uuidv4(), role: 'admin',
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      password: hash, storeName: 'Corporate', storeAddress: '',
      ownerName: 'Admin', plannedOpenDate: '',
      createdAt: new Date().toISOString()
    });
    await db.seedTasksIfEmpty();
    res.json({ success: true, message: 'Admin account created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Seed failed' }); }
});


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

// ══ UPCOMING LOCATIONS ═══════════════════════════════════

// Get all upcoming locations with task progress
router.get('/upcoming', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [locations, allTasks] = await Promise.all([
      db.getUpcomingLocations(), db.getAllUpcomingTasks()
    ]);
    const result = locations.map(loc => {
      const tasks = allTasks.filter(t => t.locationId === loc.id);
      const done = tasks.filter(t => t.completed).length;
      return {
        ...loc,
        completedCount: done,
        totalCount: tasks.length,
        pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0
      };
    });
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Create upcoming location
router.post('/upcoming', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { storeName, storeAddress, ownerName, ownerEmail, ownerPhone, plannedOpenDate, notes } = req.body;
    if (!storeName || !plannedOpenDate) return res.status(400).json({ error: 'Store name and open date required' });
    const loc = {
      id: 'up-' + uuidv4().slice(0, 8),
      storeName, storeAddress: storeAddress || '', ownerName: ownerName || '',
      ownerEmail: ownerEmail || '', ownerPhone: ownerPhone || '',
      plannedOpenDate, notes: notes || '',
      createdAt: new Date().toISOString(), createdBy: req.user.email
    };
    await db.createUpcomingLocation(loc);

    // Auto-populate every master onboarding task as a prep task for this location
    const masterTasks = await db.getTasks();
    for (const t of masterTasks) {
      await db.createUpcomingTask({
        id: 'ut-' + uuidv4().slice(0, 8),
        locationId: loc.id,
        platform: t.platform,
        title: t.title,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ success: true, location: loc, tasksAdded: masterTasks.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Re-sync a location's prep tasks with the current master task list
// (adds any master tasks that are missing, leaves existing progress alone)
router.post('/upcoming/:id/sync-tasks', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [masterTasks, existing] = await Promise.all([
      db.getTasks(), db.getUpcomingTasks(req.params.id)
    ]);
    const existingTitles = new Set(existing.map(t => t.platform + '||' + t.title));
    let added = 0;
    for (const t of masterTasks) {
      if (existingTitles.has(t.platform + '||' + t.title)) continue;
      await db.createUpcomingTask({
        id: 'ut-' + uuidv4().slice(0, 8),
        locationId: req.params.id,
        platform: t.platform,
        title: t.title,
        createdAt: new Date().toISOString()
      });
      added++;
    }
    res.json({ success: true, added });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Update upcoming location
router.patch('/upcoming/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateUpcomingLocation(req.params.id, req.body);
    const loc = await db.getUpcomingLocation(req.params.id);
    res.json({ success: true, location: loc });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Delete upcoming location
router.delete('/upcoming/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.deleteUpcomingLocation(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Link an upcoming location to a registered franchisee account
router.post('/upcoming/:id/link', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    await db.updateUpcomingLocation(req.params.id, { linkedUserId: userId || null });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Upcoming location tasks ──────────────────────────────

router.get('/upcoming/:id/tasks', authMiddleware, adminOnly, async (req, res) => {
  try { res.json(await db.getUpcomingTasks(req.params.id)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/upcoming/:id/tasks', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { platform, title } = req.body;
    if (!platform || !title) return res.status(400).json({ error: 'Platform and title required' });
    const task = {
      id: 'ut-' + uuidv4().slice(0, 8),
      locationId: req.params.id, platform, title,
      createdAt: new Date().toISOString()
    };
    await db.createUpcomingTask(task);
    res.json({ success: true, task });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.patch('/upcoming-tasks/:taskId/toggle', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.toggleUpcomingTask(req.params.taskId, req.body.completed);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/upcoming-tasks/:taskId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.deleteUpcomingTask(req.params.taskId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ══ CALENDAR ═════════════════════════════════════════════

// Get all openings (active + upcoming) for calendar view
router.get('/calendar', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users, tasks, completions, upcoming, upcomingTasks] = await Promise.all([
      db.getUsers(), db.getTasks(), db.getAllCompletions(),
      db.getUpcomingLocations(), db.getAllUpcomingTasks()
    ]);

    const events = [];

    // Active (registered) franchisees
    users.filter(u => u.role === 'franchisee' && u.plannedOpenDate).forEach(u => {
      const done = completions.filter(c => c.userId === u.id).length;
      const total = tasks.length;
      events.push({
        id: u.id,
        type: 'active',
        storeName: u.storeName,
        ownerName: u.ownerName,
        storeAddress: u.storeAddress,
        email: u.email,
        date: u.plannedOpenDate,
        completedCount: done,
        totalCount: total,
        remainingCount: total - done,
        pct: total ? Math.round((done / total) * 100) : 0
      });
    });

    // Upcoming (admin-added) locations
    upcoming.forEach(loc => {
      const lTasks = upcomingTasks.filter(t => t.locationId === loc.id);
      const done = lTasks.filter(t => t.completed).length;
      events.push({
        id: loc.id,
        type: 'upcoming',
        storeName: loc.storeName,
        ownerName: loc.ownerName,
        storeAddress: loc.storeAddress,
        email: loc.ownerEmail,
        date: loc.plannedOpenDate,
        completedCount: done,
        totalCount: lTasks.length,
        remainingCount: lTasks.length - done,
        pct: lTasks.length ? Math.round((done / lTasks.length) * 100) : 0
      });
    });

    res.json(events);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Delete an active (registered) franchisee ──────────────
router.delete('/franchisees/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete an admin account' });
    await db.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Send invite email to an upcoming location's owner ─────
router.post('/upcoming/:id/send-invite', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { sendInviteEmail } = require('../utils/reminders');
    const loc = await db.getUpcomingLocation(req.params.id);
    if (!loc) return res.status(404).json({ error: 'Location not found' });
    if (!loc.ownerEmail) return res.status(400).json({ error: 'Add an owner email to this location first.' });
    if (!process.env.SMTP_USER) return res.status(500).json({ error: 'Email is not configured on the server.' });

    const tasks = await db.getUpcomingTasks(req.params.id);
    const total = tasks.length || (await db.getTasks()).length;

    await sendInviteEmail(loc, total);
    await db.markInviteSent(req.params.id, req.user.email);

    const updated = await db.getUpcomingLocation(req.params.id);
    res.json({ success: true, location: updated });
  } catch (err) {
    console.error('Invite send failed:', err);
    res.status(500).json({ error: err.message || 'Failed to send invite' });
  }
});

// ── Preview the invite email (for sending manually from your own inbox) ──
router.get('/upcoming/:id/invite-preview', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { buildInviteEmail } = require('../utils/reminders');
    const loc = await db.getUpcomingLocation(req.params.id);
    if (!loc) return res.status(404).json({ error: 'Location not found' });
    const tasks = await db.getUpcomingTasks(req.params.id);
    const total = tasks.length || (await db.getTasks()).length;
    const { subject, html, text } = buildInviteEmail(loc, total);
    res.json({ to: loc.ownerEmail || '', subject, html, text });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Mark an invite as sent manually (when you email them yourself)
router.post('/upcoming/:id/mark-invited', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.markInviteSent(req.params.id, req.user.email + ' (sent manually)');
    const updated = await db.getUpcomingLocation(req.params.id);
    res.json({ success: true, location: updated });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Emergency admin password rotation. Requires SEED_SECRET.
// Sets the admin password to whatever ADMIN_PASSWORD is currently set to in
// the environment, so the new value only ever lives in Railway variables.
router.post('/rotate-admin', async (req, res) => {
  try {
    if (req.body?.secret !== process.env.SEED_SECRET)
      return res.status(403).json({ error: 'Forbidden' });

    const email = process.env.ADMIN_EMAIL;
    const newPassword = process.env.ADMIN_PASSWORD;
    if (!email || !newPassword)
      return res.status(400).json({ error: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables' });

    const hash = await bcrypt.hash(newPassword, 10);
    const updated = await db.resetAdminPassword(email, hash);

    if (updated === 0) {
      // No admin with that email yet, so create one
      await db.createUser({
        id: uuidv4(), role: 'admin', email: email.toLowerCase(), password: hash,
        storeName: 'Corporate', storeAddress: '', ownerName: 'Admin',
        plannedOpenDate: '', createdAt: new Date().toISOString()
      });
      return res.json({ success: true, action: 'created', email });
    }

    res.json({ success: true, action: 'password reset', email });
  } catch (err) {
    console.error('Rotate admin failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
