const db = require('../db/postgres');
const { sendOpenDateChangeAlert } = require('./mailer');

// Accepts only a real calendar date in YYYY-MM-DD form
function validDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === str;
}

// Saves changes to a registered location and handles everything that
// depends on the open date: reminder emails and the admin alert.
async function applyLocationUpdate(user, fields, changedBy) {
  const oldDate = user.plannedOpenDate;
  await db.updateFranchiseeDetails(user.id, fields);

  const newDate = fields.plannedOpenDate;
  if (newDate && newDate !== oldDate) {
    // Pushed later: reset so milestone reminders go out again at the new marks
    if (!oldDate || newDate > oldDate) await db.clearReminders(user.id);
    const updated = await db.getUserById(user.id);
    sendOpenDateChangeAlert(updated, oldDate, newDate, changedBy)
      .catch(e => console.error('Open date alert failed:', e));
  }
  return db.getUserById(user.id);
}

module.exports = { validDate, applyLocationUpdate };
