require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initDB, seedTasksIfEmpty } = require('./db/postgres');

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

async function start() {
  await initDB();
  await seedTasksIfEmpty();
  app.listen(PORT, () => {
    console.log(`\n🟢 Pure Green Onboarding Portal running on http://localhost:${PORT}`);
    console.log(`   Admin seed: POST /api/admin/seed with { "secret": "puregreenadmin2024" }\n`);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
