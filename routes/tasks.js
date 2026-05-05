const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/postgres');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendTaskCompletionAlert } = require('../utils/mailer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Franchisee: get all tasks with completion status
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [tasks, completions] = await Promise.all([db.getTasks(), db.getCompletions(req.user.id)]);
    const result = tasks.map(task => {
      const c = completions.find(c => c.taskId === task.id);
      return { ...task, completed: !!c, completedAt: c?.completedAt || null, uploadPath: c?.uploadPath || null, credentials: c?.credentials || null };
    });
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Franchisee: complete a task
router.post('/:taskId/complete', authMiddleware, upload.single('proof'), async (req, res) => {
  try {
    const task = await db.getTaskById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const existing = await db.getCompletion(req.user.id, req.params.taskId);
    if (existing) return res.status(400).json({ error: 'Task already completed' });
    const user = await db.getUserById(req.user.id);
    const completion = {
      id: uuidv4(), userId: req.user.id, taskId: req.params.taskId,
      completedAt: new Date().toISOString(),
      uploadPath: req.file ? `/uploads/${req.file.filename}` : null,
      credentials: req.body.credentials ? JSON.parse(req.body.credentials) : null
    };
    await db.createCompletion(completion);
    sendTaskCompletionAlert(user, task).catch(e => console.error('Email failed:', e));
    res.json({ success: true, completion });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Franchisee: undo completion
router.delete('/:taskId/complete', authMiddleware, async (req, res) => {
  try {
    await db.deleteCompletion(req.user.id, req.params.taskId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: all tasks
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try { res.json(await db.getTasks()); } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: tasks for specific franchisee
router.get('/user/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [tasks, completions] = await Promise.all([db.getTasks(), db.getCompletions(req.params.userId)]);
    res.json(tasks.map(task => {
      const c = completions.find(c => c.taskId === task.id);
      return { ...task, completed: !!c, completedAt: c?.completedAt || null, uploadPath: c?.uploadPath || null };
    }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: create task
router.post('/admin/create', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { platform, title, description, requiresUpload, uploadLabel } = req.body;
    if (!platform || !title) return res.status(400).json({ error: 'Platform and title required' });
    const count = await db.taskCount(platform);
    const newTask = {
      id: 'custom-' + uuidv4().slice(0, 8), platform, order: count + 1,
      title, description: description || '', requiresUpload: !!requiresUpload,
      uploadLabel: uploadLabel || null, credentialsFields: null,
      videoUrl: null, isCustom: true, createdAt: new Date().toISOString()
    };
    await db.createTask(newTask);
    res.json({ success: true, task: newTask });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Admin: edit task
router.patch('/admin/:taskId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateTask(req.params.taskId, req.body);
    const task = await db.getTaskById(req.params.taskId);
    res.json({ success: true, task });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: delete task
router.delete('/admin/:taskId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.deleteTask(req.params.taskId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: update video URL
router.patch('/:taskId/video', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateTask(req.params.taskId, { videoUrl: req.body.videoUrl || null });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
