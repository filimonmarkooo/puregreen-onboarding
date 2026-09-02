require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initDB, seedTasksIfEmpty, initReminderTable } = require('./db/postgres');
const { runReminderCheck } = require('./utils/reminders');

// Required secrets. The app refuses to boot without them rather than falling
// back to defaults that live in a public repo.
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'SEED_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.error('Missing required environment variables: ' + missingEnv.join(', '));
  console.error('Set them in Railway -> Variables (see .env.example), then redeploy.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Railway terminates TLS at its proxy; trust one hop so req.secure and the
// rate limiter's client IP are correct.
app.set('trust proxy', 1);

// CORS: the front-end is served from this same origin, so no other site ever
// needs credentialed access. Only BASE_URL (if set) is allowed; everything
// else gets no CORS headers at all.
const allowedOrigins = [process.env.BASE_URL].filter(Boolean).map(u => u.replace(/\/$/, ''));
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }));

// Baseline security headers.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Secret-gated maintenance endpoints get a tight rate limit.
const maintenanceLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests' } });
app.use(['/api/run-reminders', '/api/email-test', '/api/admin/seed', '/api/admin/rotate-admin'], maintenanceLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Uploaded proof files are user-supplied: always download, never render inline.
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// Manual trigger for reminder emails (protected by seed secret)
app.post('/api/run-reminders', async (req, res) => {
  if (req.body?.secret !== process.env.SEED_SECRET)
    return res.status(403).json({ error: 'Forbidden' });
  const result = await runReminderCheck();
  res.json(result);
});

// Email diagnostics: shows what's configured and sends a live test
app.post('/api/email-test', async (req, res) => {
  if (req.body?.secret !== process.env.SEED_SECRET)
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
    console.log(`   Admin seed: POST /api/admin/seed with { "secret": "<SEED_SECRET>" }\n`);
  });

  // Checks once a day whether anyone has newly crossed the 30-day or 2-week
  // mark. Each franchisee receives at most one email per milestone, ever.
  setTimeout(() => runReminderCheck(), 30 * 1000);
  setInterval(() => runReminderCheck(), 24 * 60 * 60 * 1000);
  console.log('⏰ Milestone check scheduled (30-day and 2-week warnings only)');
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
