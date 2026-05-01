const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../../db');
const { signupSchema, loginSchema } = require('../validators');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });

  const { username, password } = parseResult.data;
  const existing = await db('users').where({ username }).first();
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  const role = 'member';
  const passwordHash = await bcrypt.hash(password, 10);
  const [id] = await db('users').insert({ username, passwordHash, role });
  const token = jwt.sign({ id, username, role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
  res.json({ token, user: { id, username, role } });
});

router.post('/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });

  const { username, password } = parseResult.data;
  const user = await db('users').where({ username }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

module.exports = router;
