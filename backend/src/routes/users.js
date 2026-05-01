const express = require('express');
const { db } = require('../../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', requireRole('admin'), async (req, res) => {
  const users = await db('users').select('id', 'username', 'role', 'createdAt');
  res.json(users);
});

module.exports = router;
