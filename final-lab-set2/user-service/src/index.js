require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const usersRouter = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use('/api/users', usersRouter);
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'user-service' }));

async function start() {
  const { pool } = require('./db');
  let retries = 10;
  while (retries > 0) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) {
      console.log(`[user-service] Waiting for DB... (${retries} left)`);
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => console.log(`[user-service] Running on :${PORT}`));
}
start();
