const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    // Seed default tasks from tasks.js on first run
    const { TASKS } = require('./tasks');
    const initial = { users: [], tasks: TASKS, completions: [], uploads: [], taskOverrides: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  // Migrate: if tasks array is empty, seed from default tasks
  if (!db.tasks || db.tasks.length === 0) {
    const { TASKS } = require('./tasks');
    db.tasks = TASKS;
    saveDB(db);
  }
  if (!db.taskOverrides) db.taskOverrides = {};
  return db;
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { loadDB, saveDB };
