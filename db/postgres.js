const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'franchisee',
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        store_name TEXT,
        store_address TEXT,
        owner_name TEXT,
        planned_open_date TEXT,
        reset_token TEXT,
        reset_expires TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        task_order INTEGER DEFAULT 0,
        title TEXT NOT NULL,
        description TEXT,
        requires_upload BOOLEAN DEFAULT false,
        upload_label TEXT,
        credentials_fields TEXT,
        video_url TEXT,
        is_custom BOOLEAN DEFAULT false,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        completed_at TEXT,
        upload_path TEXT,
        credentials TEXT,
        UNIQUE(user_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS admin_tasks (
        id TEXT PRIMARY KEY,
        franchisee_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        completed_at TEXT,
        created_at TEXT,
        created_by TEXT
      );
      CREATE TABLE IF NOT EXISTS upcoming_locations (
        id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        store_address TEXT,
        owner_name TEXT,
        owner_email TEXT,
        owner_phone TEXT,
        planned_open_date TEXT,
        notes TEXT,
        linked_user_id TEXT,
        invite_sent_at TEXT,
        invite_sent_by TEXT,
        invite_count INTEGER DEFAULT 0,
        created_at TEXT,
        created_by TEXT
      );
      CREATE TABLE IF NOT EXISTS upcoming_tasks (
        id TEXT PRIMARY KEY,
        location_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        completed_at TEXT,
        created_at TEXT
      );
    `);
    // Migrate existing installs that predate invite tracking
    await client.query(`ALTER TABLE upcoming_locations ADD COLUMN IF NOT EXISTS invite_sent_at TEXT;`);
    await client.query(`ALTER TABLE upcoming_locations ADD COLUMN IF NOT EXISTS invite_sent_by TEXT;`);
    await client.query(`ALTER TABLE upcoming_locations ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link_label TEXT;`);
    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
}

// ── Users ─────────────────────────────────────────────────
async function getUsers() {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(dbToUser);
}
async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return rows[0] ? dbToUser(rows[0]) : null;
}
async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? dbToUser(rows[0]) : null;
}
async function getUserByResetToken(token) {
  const { rows } = await pool.query('SELECT * FROM users WHERE reset_token = $1', [token]);
  return rows[0] ? dbToUser(rows[0]) : null;
}
async function createUser(user) {
  await pool.query(
    `INSERT INTO users (id, role, email, password, store_name, store_address, owner_name, planned_open_date, reset_token, reset_expires, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [user.id, user.role, user.email, user.password, user.storeName, user.storeAddress,
     user.ownerName, user.plannedOpenDate, null, null, user.createdAt]
  );
  return user;
}
async function updateUserPassword(id, hash) {
  await pool.query('UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE id=$2', [hash, id]);
}
async function setResetToken(id, token, expires) {
  await pool.query('UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3', [token, expires, id]);
}
async function adminExists() {
  const { rows } = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  return rows.length > 0;
}
function dbToUser(row) {
  return {
    id: row.id, role: row.role, email: row.email, password: row.password,
    storeName: row.store_name, storeAddress: row.store_address,
    ownerName: row.owner_name, plannedOpenDate: row.planned_open_date,
    resetToken: row.reset_token, resetExpires: row.reset_expires,
    createdAt: row.created_at
  };
}

// ── Tasks ─────────────────────────────────────────────────
const PLATFORM_ORDER = ['Square', 'Uber Eats', 'DoorDash', 'Grubhub', 'Stream'];
async function getTasks() {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY task_order ASC');
  return rows.map(dbToTask).sort((a, b) => {
    // Unknown (admin-added) platforms sort after the five base ones
    const rank = p => { const i = PLATFORM_ORDER.indexOf(p); return i === -1 ? 999 : i; };
    const pi = rank(a.platform) - rank(b.platform);
    return pi !== 0 ? pi : (a.order || 0) - (b.order || 0);
  });
}
async function getTaskById(id) {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
  return rows[0] ? dbToTask(rows[0]) : null;
}
async function createTask(task) {
  await pool.query(
    `INSERT INTO tasks (id, platform, task_order, title, description, requires_upload, upload_label, credentials_fields, video_url, is_custom, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [task.id, task.platform, task.order, task.title, task.description,
     task.requiresUpload, task.uploadLabel,
     task.credentialsFields ? JSON.stringify(task.credentialsFields) : null,
     task.videoUrl, task.linkLabel || null, task.isCustom || false, task.createdAt || new Date().toISOString()]
  );
  return task;
}
async function updateTask(id, fields) {
  const sets = []; const vals = []; let i = 1;
  if (fields.title !== undefined)          { sets.push(`title=$${i++}`);           vals.push(fields.title); }
  if (fields.description !== undefined)    { sets.push(`description=$${i++}`);     vals.push(fields.description); }
  if (fields.requiresUpload !== undefined) { sets.push(`requires_upload=$${i++}`); vals.push(fields.requiresUpload); }
  if (fields.uploadLabel !== undefined)    { sets.push(`upload_label=$${i++}`);    vals.push(fields.uploadLabel); }
  if (fields.platform !== undefined)       { sets.push(`platform=$${i++}`);        vals.push(fields.platform); }
  if (fields.videoUrl !== undefined)       { sets.push(`video_url=$${i++}`);       vals.push(fields.videoUrl); }
  if (fields.linkLabel !== undefined)      { sets.push(`link_label=$${i++}`);      vals.push(fields.linkLabel || null); }
  if (fields.credentialsFields !== undefined) {
    sets.push(`credentials_fields=$${i++}`);
    vals.push((Array.isArray(fields.credentialsFields) && fields.credentialsFields.length) ? JSON.stringify(fields.credentialsFields) : null);
  }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE tasks SET ${sets.join(',')} WHERE id=$${i}`, vals);
}
async function deleteTask(id) {
  await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
  await pool.query('DELETE FROM completions WHERE task_id=$1', [id]);
}
async function taskCount(platform) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM tasks WHERE platform=$1', [platform]);
  return parseInt(rows[0].count);
}
async function seedTasksIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM tasks');
  if (parseInt(rows[0].count) > 0) return;
  const { TASKS } = require('./tasks');
  for (const task of TASKS) { await createTask(task); }
  console.log('✅ Default tasks seeded');
}
function dbToTask(row) {
  return {
    id: row.id, platform: row.platform, order: row.task_order,
    title: row.title, description: row.description,
    requiresUpload: row.requires_upload, uploadLabel: row.upload_label,
    credentialsFields: row.credentials_fields ? JSON.parse(row.credentials_fields) : null,
    videoUrl: row.video_url, linkLabel: row.link_label,
    isCustom: row.is_custom, createdAt: row.created_at
  };
}

// ── Completions ───────────────────────────────────────────
async function getCompletions(userId) {
  const { rows } = await pool.query('SELECT * FROM completions WHERE user_id=$1', [userId]);
  return rows.map(dbToCompletion);
}
async function getCompletion(userId, taskId) {
  const { rows } = await pool.query('SELECT * FROM completions WHERE user_id=$1 AND task_id=$2', [userId, taskId]);
  return rows[0] ? dbToCompletion(rows[0]) : null;
}
async function createCompletion(completion) {
  await pool.query(
    `INSERT INTO completions (id, user_id, task_id, completed_at, upload_path, credentials) VALUES ($1,$2,$3,$4,$5,$6)`,
    [completion.id, completion.userId, completion.taskId, completion.completedAt,
     completion.uploadPath, completion.credentials ? JSON.stringify(completion.credentials) : null]
  );
  return completion;
}
async function deleteCompletion(userId, taskId) {
  await pool.query('DELETE FROM completions WHERE user_id=$1 AND task_id=$2', [userId, taskId]);
}
async function getAllCompletions() {
  const { rows } = await pool.query('SELECT * FROM completions');
  return rows.map(dbToCompletion);
}
function dbToCompletion(row) {
  return {
    id: row.id, userId: row.user_id, taskId: row.task_id,
    completedAt: row.completed_at, uploadPath: row.upload_path,
    credentials: row.credentials ? JSON.parse(row.credentials) : null
  };
}

// ── Admin Internal Tasks ──────────────────────────────────
async function getAdminTasks(franchiseeId) {
  const { rows } = await pool.query(
    'SELECT * FROM admin_tasks WHERE franchisee_id=$1 ORDER BY platform, created_at ASC',
    [franchiseeId]
  );
  return rows.map(r => ({
    id: r.id, franchiseeId: r.franchisee_id, platform: r.platform,
    title: r.title, completed: r.completed,
    completedAt: r.completed_at, createdAt: r.created_at, createdBy: r.created_by
  }));
}
async function createAdminTask(task) {
  await pool.query(
    `INSERT INTO admin_tasks (id, franchisee_id, platform, title, completed, completed_at, created_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [task.id, task.franchiseeId, task.platform, task.title, false, null, task.createdAt, task.createdBy]
  );
  return task;
}
async function toggleAdminTask(id, completed) {
  await pool.query(
    'UPDATE admin_tasks SET completed=$1, completed_at=$2 WHERE id=$3',
    [completed, completed ? new Date().toISOString() : null, id]
  );
}
async function deleteAdminTask(id) {
  await pool.query('DELETE FROM admin_tasks WHERE id=$1', [id]);
}


// ── Upcoming Locations ────────────────────────────────────
async function getUpcomingLocations() {
  const { rows } = await pool.query('SELECT * FROM upcoming_locations ORDER BY planned_open_date ASC');
  return rows.map(dbToUpcoming);
}
async function getUpcomingLocation(id) {
  const { rows } = await pool.query('SELECT * FROM upcoming_locations WHERE id=$1', [id]);
  return rows[0] ? dbToUpcoming(rows[0]) : null;
}
async function createUpcomingLocation(loc) {
  await pool.query(
    `INSERT INTO upcoming_locations (id, store_name, store_address, owner_name, owner_email, owner_phone, planned_open_date, notes, linked_user_id, created_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [loc.id, loc.storeName, loc.storeAddress, loc.ownerName, loc.ownerEmail, loc.ownerPhone,
     loc.plannedOpenDate, loc.notes, null, loc.createdAt, loc.createdBy]
  );
  return loc;
}
async function updateUpcomingLocation(id, fields) {
  const sets = []; const vals = []; let i = 1;
  if (fields.storeName !== undefined)       { sets.push(`store_name=$${i++}`);        vals.push(fields.storeName); }
  if (fields.storeAddress !== undefined)    { sets.push(`store_address=$${i++}`);     vals.push(fields.storeAddress); }
  if (fields.ownerName !== undefined)       { sets.push(`owner_name=$${i++}`);        vals.push(fields.ownerName); }
  if (fields.ownerEmail !== undefined)      { sets.push(`owner_email=$${i++}`);       vals.push(fields.ownerEmail); }
  if (fields.ownerPhone !== undefined)      { sets.push(`owner_phone=$${i++}`);       vals.push(fields.ownerPhone); }
  if (fields.plannedOpenDate !== undefined) { sets.push(`planned_open_date=$${i++}`); vals.push(fields.plannedOpenDate); }
  if (fields.notes !== undefined)           { sets.push(`notes=$${i++}`);             vals.push(fields.notes); }
  if (fields.linkedUserId !== undefined)    { sets.push(`linked_user_id=$${i++}`);    vals.push(fields.linkedUserId); }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE upcoming_locations SET ${sets.join(',')} WHERE id=$${i}`, vals);
}
async function deleteUpcomingLocation(id) {
  await pool.query('DELETE FROM upcoming_locations WHERE id=$1', [id]);
  await pool.query('DELETE FROM upcoming_tasks WHERE location_id=$1', [id]);
}
function dbToUpcoming(r) {
  return {
    id: r.id, storeName: r.store_name, storeAddress: r.store_address,
    ownerName: r.owner_name, ownerEmail: r.owner_email, ownerPhone: r.owner_phone,
    plannedOpenDate: r.planned_open_date, notes: r.notes,
    linkedUserId: r.linked_user_id, createdAt: r.created_at, createdBy: r.created_by,
    inviteSentAt: r.invite_sent_at, inviteSentBy: r.invite_sent_by, inviteCount: r.invite_count || 0
  };
}

async function markInviteSent(id, sentBy) {
  await pool.query(
    'UPDATE upcoming_locations SET invite_sent_at=$1, invite_sent_by=$2, invite_count=COALESCE(invite_count,0)+1 WHERE id=$3',
    [new Date().toISOString(), sentBy, id]
  );
}

// ── Upcoming Location Tasks ───────────────────────────────
async function getUpcomingTasks(locationId) {
  const { rows } = await pool.query('SELECT * FROM upcoming_tasks WHERE location_id=$1 ORDER BY platform, created_at ASC', [locationId]);
  return rows.map(r => ({
    id: r.id, locationId: r.location_id, platform: r.platform, title: r.title,
    completed: r.completed, completedAt: r.completed_at, createdAt: r.created_at
  }));
}
async function getAllUpcomingTasks() {
  const { rows } = await pool.query('SELECT * FROM upcoming_tasks');
  return rows.map(r => ({
    id: r.id, locationId: r.location_id, platform: r.platform, title: r.title,
    completed: r.completed, completedAt: r.completed_at, createdAt: r.created_at
  }));
}
async function createUpcomingTask(task) {
  await pool.query(
    `INSERT INTO upcoming_tasks (id, location_id, platform, title, completed, completed_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [task.id, task.locationId, task.platform, task.title, false, null, task.createdAt]
  );
  return task;
}
async function toggleUpcomingTask(id, completed) {
  await pool.query('UPDATE upcoming_tasks SET completed=$1, completed_at=$2 WHERE id=$3',
    [completed, completed ? new Date().toISOString() : null, id]);
}
async function deleteUpcomingTask(id) {
  await pool.query('DELETE FROM upcoming_tasks WHERE id=$1', [id]);
}

module.exports = {
  initDB, pool,
  getUsers, getUserByEmail, getUserById, getUserByResetToken,
  createUser, updateUserPassword, setResetToken, adminExists,
  getTasks, getTaskById, createTask, updateTask, deleteTask, taskCount, seedTasksIfEmpty,
  getCompletions, getCompletion, createCompletion, deleteCompletion, getAllCompletions,
  getAdminTasks, createAdminTask, toggleAdminTask, deleteAdminTask,
  getUpcomingLocations, getUpcomingLocation, createUpcomingLocation, updateUpcomingLocation, deleteUpcomingLocation,
  getUpcomingTasks, getAllUpcomingTasks, createUpcomingTask, toggleUpcomingTask, deleteUpcomingTask,
  markInviteSent
};

// ── Delete a franchisee and all their data ────────────────
async function deleteUser(id) {
  await pool.query('DELETE FROM completions WHERE user_id=$1', [id]);
  await pool.query('DELETE FROM admin_tasks WHERE franchisee_id=$1', [id]);
  await pool.query('UPDATE upcoming_locations SET linked_user_id=NULL WHERE linked_user_id=$1', [id]);
  await pool.query('DELETE FROM users WHERE id=$1 AND role=$2', [id, 'franchisee']);
}

// ── Reminder log (prevents duplicate emails) ──────────────
async function initReminderTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS reminder_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    milestone TEXT NOT NULL,
    sent_at TEXT,
    UNIQUE(user_id, milestone)
  );`);
}
async function reminderAlreadySent(userId, milestone) {
  const { rows } = await pool.query('SELECT id FROM reminder_log WHERE user_id=$1 AND milestone=$2', [userId, milestone]);
  return rows.length > 0;
}
async function logReminder(userId, milestone) {
  await pool.query(
    'INSERT INTO reminder_log (user_id, milestone, sent_at) VALUES ($1,$2,$3) ON CONFLICT (user_id, milestone) DO NOTHING',
    [userId, milestone, new Date().toISOString()]
  );
}

module.exports.deleteUser = deleteUser;
module.exports.initReminderTable = initReminderTable;
module.exports.reminderAlreadySent = reminderAlreadySent;
module.exports.logReminder = logReminder;

// Reset an admin account's password (used by the emergency rotate endpoint)
async function resetAdminPassword(email, hash) {
  const { rowCount } = await pool.query(
    "UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE LOWER(email)=LOWER($2) AND role='admin'",
    [hash, email]
  );
  return rowCount;
}
module.exports.resetAdminPassword = resetAdminPassword;
