require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initDB, seedTasksIfEmpty, initReminderTable } = require('./db/postgres');
const { runReminderCheck } = require('./utils/reminders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// Manual trigger for reminder emails (protected by seed secret)
app.post('/api/run-reminders', async (req, res) => {
  if (req.body?.secret !== (process.env.SEED_SECRET || 'puregreenadmin2024'))
    return res.status(403).json({ error: 'Forbidden' });
  const result = await runReminderCheck();
  res.json(result);
});

// Email diagnostics: shows what's configured and sends a live test
app.post('/api/email-test', async (req, res) => {
  if (req.body?.secret !== (process.env.SEED_SECRET || 'puregreenadmin2024'))
    return res.status(403).json({ error: 'Forbidden' });

  const { sendMail, usingResend, emailConfigured, fromAddress } = require('./utils/sender');
  const passLen = (process.env.SMTP_PASS || '').replace(/\s/g, '').length;

  const config = {
    provider: usingResend() ? 'Resend (HTTPS)' : 'SMTP / Gmail',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'set' : '(not set)',
    MAIL_FROM: process.env.MAIL_FROM || '(using default)',
    from: fromAddress(),
    SMTP_HOST: process.env.SMTP_HOST || '(not set)',
    SMTP_PORT: process.env.SMTP_PORT || '(not set)',
    SMTP_USER: process.env.SMTP_USER || '(not set)',
    SMTP_PASS: passLen ? ('set, ' + passLen + ' chars') : '(not set)',
    BASE_URL: process.env.BASE_URL || '(not set)'
  };

  if (!emailConfigured())
    return res.json({ ok: false, reason: 'No email provider configured. Set RESEND_API_KEY, or SMTP_USER + SMTP_PASS.', config });

  const to = req.body.to || process.env.ADMIN_EMAIL_1 || process.env.SMTP_USER;
  const result = await sendMail({
    to,
    subject: 'Pure Green portal: email test',
    html: '<p>If you are reading this, email from the Pure Green onboarding portal is working correctly.</p>'
  });

  res.json({
    ok: result.ok,
    via: result.via,
    sentTo: result.ok ? to : undefined,
    reason: result.ok ? undefined : result.error,
    hint: (!result.ok && result.code === 'ETIMEDOUT')
      ? 'Railway is blocking outbound SMTP. Switch to Resend: add RESEND_API_KEY in Variables.'
      : undefined,
    config
  });
});

async function start() {
  await initDB();
  await initReminderTable();
  await seedTasksIfEmpty();

  app.listen(PORT, () => {
    console.log(`\n🟢 Pure Green Onboarding Portal running on http://localhost:${PORT}`);
    console.log(`   Admin seed: POST /api/admin/seed with { "secret": "puregreenadmin2024" }\n`);
  });

  // Checks once a day whether anyone has newly crossed the 30-day or 2-week
  // mark. Each franchisee receives at most one email per milestone, ever.
  setTimeout(() => runReminderCheck(), 30 * 1000);
  setInterval(() => runReminderCheck(), 24 * 60 * 60 * 1000);
  console.log('⏰ Milestone check scheduled (30-day and 2-week warnings only)');
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
