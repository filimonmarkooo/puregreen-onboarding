const db = require('../db/postgres');
const { sendMail, emailConfigured } = require('./sender');

const FROM = `"Pure Green Franchise" <${process.env.SMTP_USER || 'noreply@puregreen.com'}>`;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REPLY_TO = 'marko@puregreenfranchise.com, richard@puregreenfranchise.com';


// Milestones: days-out threshold -> label
const MILESTONES = [
  { key: '30day', days: 30, label: '30 Days Out' },
  { key: '14day', days: 14, label: '2 Weeks Out' }
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr.split('T')[0] + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function statusFor(days, pct) {
  if (days === null) return 'green';
  if (days <= 14 && pct < 100) return 'red';
  if (days <= 30 && pct < 50) return 'yellow';
  if (days < 0 && pct < 100) return 'red';
  return 'green';
}

function buildEmail(user, milestone, done, total, pct, days) {
  const remaining = total - done;
  const status = statusFor(days, pct);
  const accent = status === 'red' ? '#c0392b' : status === 'yellow' ? '#FF912E' : '#046A38';
  const headline = status === 'red'
    ? 'Action needed on your onboarding'
    : status === 'yellow'
      ? 'Time to pick up the pace'
      : 'You are on track';

  const message = remaining === 0
    ? `Every onboarding task is complete. Nothing else is required from you before opening day.`
    : `You have <strong>${remaining} task${remaining !== 1 ? 's' : ''}</strong> left to finish before your doors open${days >= 0 ? ` in ${days} day${days !== 1 ? 's' : ''}` : ''}.`;

  return {
    subject: `${milestone.label}: ${user.storeName} is ${pct}% complete`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#046A38;padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">pure<span style="color:#87CE21;">green</span></h1>
          <p style="color:#87CE21;margin:8px 0 0;font-size:12px;letter-spacing:2px;">FRANCHISE ONBOARDING</p>
        </div>
        <div style="background:#f9f9f9;padding:32px;">
          <div style="display:inline-block;background:${accent};color:white;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:bold;letter-spacing:1px;margin-bottom:16px;">
            ${milestone.label.toUpperCase()}
          </div>
          <h2 style="color:${accent};margin:0 0 12px;">${headline}</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Hi ${user.ownerName || 'there'}, ${message}
          </p>

          <div style="background:white;border-radius:10px;padding:20px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="text-align:center;padding:8px;">
                  <div style="font-size:28px;font-weight:bold;color:#046A38;">${done}</div>
                  <div style="font-size:11px;color:#999;letter-spacing:1px;">COMPLETED</div>
                </td>
                <td style="text-align:center;padding:8px;">
                  <div style="font-size:28px;font-weight:bold;color:${accent};">${remaining}</div>
                  <div style="font-size:11px;color:#999;letter-spacing:1px;">REMAINING</div>
                </td>
                <td style="text-align:center;padding:8px;">
                  <div style="font-size:28px;font-weight:bold;color:#ccc;">${total}</div>
                  <div style="font-size:11px;color:#999;letter-spacing:1px;">TOTAL</div>
                </td>
              </tr>
            </table>
            <div style="background:#D3DEE3;border-radius:99px;height:10px;margin-top:14px;overflow:hidden;">
              <div style="background:${accent};height:100%;width:${pct}%;border-radius:99px;"></div>
            </div>
            <p style="text-align:center;color:#999;font-size:12px;margin:8px 0 0;">${pct}% complete</p>
          </div>

          <div style="text-align:center;">
            <a href="${BASE_URL}" style="background:#046A38;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Open My Onboarding Dashboard
            </a>
          </div>

          <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">
            Questions? Reach out to marko@puregreenfranchise.com or richard@puregreenfranchise.com.
          </p>
        </div>
      </div>
    `
  };
}

// Send a single milestone email
async function sendMilestoneEmail(user, milestone, done, total, pct, days) {
  if (!emailConfigured()) return false;
  const { subject, html } = buildEmail(user, milestone, done, total, pct, days);
  const r = await sendMail({ to: user.email, subject, html });
  if (!r.ok) throw new Error(r.error);
  return true;
}

// Welcome email sent immediately on registration
async function sendWelcomeEmail(user, total) {
  if (!emailConfigured()) return false;
  const days = daysUntil(user.plannedOpenDate);
  const r = await sendMail({
    to: user.email,
    subject: `Welcome to the Pure Green family. Your tech onboarding starts now.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#046A38;padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">pure<span style="color:#87CE21;">green</span></h1>
          <p style="color:#87CE21;margin:8px 0 0;font-size:12px;letter-spacing:2px;">FRANCHISE ONBOARDING</p>
        </div>
        <div style="background:#f9f9f9;padding:32px;">
          <h2 style="color:#046A38;margin:0 0 12px;">Welcome to the Pure Green family, ${user.ownerName || 'partner'}!</h2>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            We're thrilled to have you and <strong>${user.storeName}</strong> joining us. You're now part of a
            brand built on connecting people with real, high quality superfoods, and we're here to make sure
            you open strong.
          </p>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            This portal covers your <strong>tech package onboarding</strong>. It gets your point of sale,
            delivery platforms, and ordering systems fully set up and talking to each other before you open.
            You have <strong>${total} tasks</strong> across Square, Uber Eats, DoorDash, Grubhub, and Stream${days !== null && days >= 0 ? `, with <strong>${days} days</strong> until your planned opening` : ''}.
          </p>

          <div style="background:#fff3cd;border-left:5px solid #FF912E;border-radius:8px;padding:18px 20px;margin:24px 0;">
            <p style="margin:0 0 8px;color:#7a5c00;font-size:13px;font-weight:bold;letter-spacing:1px;">
              ⚠️ IMPORTANT: BEFORE HQ TRAINING
            </p>
            <p style="margin:0;color:#6b5200;font-size:15px;line-height:1.6;">
              <strong>All Square tasks must be completed before you attend HQ training.</strong>
              Your Square account, business location, branding, tax forms, banking, tax rates, permissions,
              and team members all need to be set up in advance. We build directly on that foundation during
              training, so arriving without it finished will hold up your session and your opening timeline.
            </p>
          </div>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            Everything else, including Uber Eats, DoorDash, Grubhub, and Stream, can be worked through after that.
            Each task tells you exactly what to do, and some include a tutorial video. Upload a screenshot or
            document as proof when you finish one, and our team is notified automatically.
          </p>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            Your progress saves as you go, so log in and out as often as you need. We'll check in as your
            opening date gets closer.
          </p>

          <div style="text-align:center;margin-top:28px;">
            <a href="${BASE_URL}" style="background:#046A38;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Start With Square
            </a>
          </div>

          <p style="color:#999;font-size:13px;text-align:center;margin-top:26px;line-height:1.6;">
            Questions along the way? Reach out to marko@puregreenfranchise.com or richard@puregreenfranchise.com.<br>
            Welcome aboard. Let's build something great.
          </p>
        </div>
      </div>
    `
  });
  if (!r.ok) throw new Error(r.error);
  return true;
}

// Runs daily. Checks every franchisee and sends any milestone email that's due
async function runReminderCheck() {
  if (!emailConfigured()) {
    console.log('⏭  Reminder check skipped (no email provider configured)');
    return { sent: 0, skipped: true };
  }
  try {
    const [users, tasks, completions] = await Promise.all([
      db.getUsers(), db.getTasks(), db.getAllCompletions()
    ]);
    const total = tasks.length;
    let sent = 0;

    for (const user of users) {
      if (user.role !== 'franchisee' || !user.plannedOpenDate) continue;
      const days = daysUntil(user.plannedOpenDate);
      if (days === null || days < 0) continue;

      const done = completions.filter(c => c.userId === user.id).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      if (pct === 100) continue; // all done, no nagging

      // Find the tightest milestone this store currently qualifies for
      const due = MILESTONES.filter(m => days <= m.days).sort((a, b) => a.days - b.days)[0];
      if (!due) continue;

      const already = await db.reminderAlreadySent(user.id, due.key);
      if (already) continue;

      await sendMilestoneEmail(user, due, done, total, pct, days);
      await db.logReminder(user.id, due.key);
      sent++;
      console.log(`📧 Sent ${due.key} reminder to ${user.email} (${pct}%, ${days}d out)`);
    }

    console.log(`✅ Reminder check complete: ${sent} email${sent !== 1 ? 's' : ''} sent`);
    return { sent };
  } catch (err) {
    console.error('Reminder check failed:', err);
    return { sent: 0, error: err.message };
  }
}

module.exports = { runReminderCheck, sendWelcomeEmail, sendMilestoneEmail, daysUntil, statusFor, MILESTONES };

// Invite email sent manually by an admin from the Upcoming Locations tab
function buildInviteEmail(loc, total) {
  const days = daysUntil(loc.plannedOpenDate);
  return {
    subject: 'Welcome to the Pure Green family. Your tech onboarding starts now.',
    html: inviteHtml(loc, total, days),
    text: invitePlainText(loc, total, days)
  };
}

function invitePlainText(loc, total, days) {
  return `Welcome to the Pure Green family, ${loc.ownerName || 'partner'}!

We're thrilled to have you and ${loc.storeName} joining us. You're now part of a brand built on connecting people with real, high quality superfoods, and we're here to make sure you open strong.

This portal covers your tech package onboarding. It gets your point of sale, delivery platforms, and ordering systems fully set up and talking to each other before you open. You'll have ${total} tasks across Square, Uber Eats, DoorDash, Grubhub, and Stream${days !== null && days >= 0 ? `, with ${days} days until your planned opening` : ''}.

STEP 1: CREATE YOUR ACCOUNT
Go to ${BASE_URL}, choose "New Location", and register using this email address (${loc.ownerEmail}). Your full onboarding checklist will be ready the moment you finish.

IMPORTANT: BEFORE HQ TRAINING
All Square tasks must be completed before you attend HQ training. Your Square account, business location, branding, tax forms, banking, tax rates, permissions, and team members all need to be set up in advance. We build directly on that foundation during training, so arriving without it finished will hold up your session and your opening timeline.

Everything else, including Uber Eats, DoorDash, Grubhub, and Stream, can be worked through after that. Each task tells you exactly what to do, and some include a tutorial video. Upload a screenshot or document as proof when you finish one, and our team is notified automatically.

Get started: ${BASE_URL}

Questions along the way? Reach out to marko@puregreenfranchise.com or richard@puregreenfranchise.com.
Welcome aboard. Let's build something great.`;
}

function inviteHtml(loc, total, days) {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#046A38;padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">pure<span style="color:#87CE21;">green</span></h1>
          <p style="color:#87CE21;margin:8px 0 0;font-size:12px;letter-spacing:2px;">FRANCHISE ONBOARDING</p>
        </div>
        <div style="background:#f9f9f9;padding:32px;">
          <h2 style="color:#046A38;margin:0 0 12px;">Welcome to the Pure Green family, ${loc.ownerName || 'partner'}!</h2>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            We're thrilled to have you and <strong>${loc.storeName}</strong> joining us. You're now part of a
            brand built on connecting people with real, high quality superfoods, and we're here to make sure
            you open strong.
          </p>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            This portal covers your <strong>tech package onboarding</strong>. It gets your point of sale,
            delivery platforms, and ordering systems fully set up and talking to each other before you open.
            You'll have <strong>${total} tasks</strong> across Square, Uber Eats, DoorDash, Grubhub, and Stream${days !== null && days >= 0 ? `, with <strong>${days} days</strong> until your planned opening` : ''}.
          </p>

          <div style="background:#e8f5ee;border-left:5px solid #046A38;border-radius:8px;padding:18px 20px;margin:24px 0;">
            <p style="margin:0 0 8px;color:#046A38;font-size:13px;font-weight:bold;letter-spacing:1px;">
              STEP 1: CREATE YOUR ACCOUNT
            </p>
            <p style="margin:0;color:#2d5c43;font-size:15px;line-height:1.6;">
              Click the button below, choose <strong>New Location</strong>, and register using this email address
              (<strong>${loc.ownerEmail}</strong>). Your full onboarding checklist will be ready the moment you finish.
            </p>
          </div>

          <div style="background:#fff3cd;border-left:5px solid #FF912E;border-radius:8px;padding:18px 20px;margin:24px 0;">
            <p style="margin:0 0 8px;color:#7a5c00;font-size:13px;font-weight:bold;letter-spacing:1px;">
              ⚠️ IMPORTANT: BEFORE HQ TRAINING
            </p>
            <p style="margin:0;color:#6b5200;font-size:15px;line-height:1.6;">
              <strong>All Square tasks must be completed before you attend HQ training.</strong>
              Your Square account, business location, branding, tax forms, banking, tax rates, permissions,
              and team members all need to be set up in advance. We build directly on that foundation during
              training, so arriving without it finished will hold up your session and your opening timeline.
            </p>
          </div>

          <p style="color:#555;font-size:15px;line-height:1.6;">
            Everything else, including Uber Eats, DoorDash, Grubhub, and Stream, can be worked through after that.
            Each task tells you exactly what to do, and some include a tutorial video. Upload a screenshot or
            document as proof when you finish one, and our team is notified automatically.
          </p>

          <div style="text-align:center;margin-top:28px;">
            <a href="${BASE_URL}" style="background:#046A38;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
              Create My Account
            </a>
          </div>

          <p style="color:#999;font-size:13px;text-align:center;margin-top:26px;line-height:1.6;">
            Questions along the way? Reach out to marko@puregreenfranchise.com or richard@puregreenfranchise.com.<br>
            Welcome aboard. Let's build something great.
          </p>
        </div>
      </div>
    `;
}

async function sendInviteEmail(loc, total) {
  if (!emailConfigured()) throw new Error('No email provider configured on the server.');
  if (!loc.ownerEmail) throw new Error('This location has no owner email set.');
  const { subject, html, text } = buildInviteEmail(loc, total);
  const r = await sendMail({ to: loc.ownerEmail, subject, html, text });
  if (!r.ok) throw new Error(r.error);
  return true;
}

module.exports.sendInviteEmail = sendInviteEmail;
module.exports.buildInviteEmail = buildInviteEmail;
