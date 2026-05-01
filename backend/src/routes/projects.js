const express = require('express');
const { db } = require('../../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { projectSchema, projectMemberSchema } = require('../validators');

const router = express.Router();

router.use(authMiddleware);

async function projectWithMembers(project) {
  const members = await db('project_members')
    .where({ projectId: project.id })
    .join('users', 'project_members.userId', 'users.id')
    .select('users.id', 'users.username', 'users.role', 'project_members.membershipRole');

  return { ...project, members };
}

router.get('/', async (req, res) => {
  let projectsQuery = db('projects').select('projects.*').orderBy('projects.createdAt', 'desc');

  if (req.user.role === 'member') {
    projectsQuery = projectsQuery
      .join('project_members', 'project_members.projectId', 'projects.id')
      .where('project_members.userId', req.user.id);
  }

  const projects = await projectsQuery;
  const projectRows = await Promise.all(projects.map(projectWithMembers));
  res.json(projectRows);
});

router.post('/', requireRole('admin'), async (req, res) => {
  const parseResult = projectSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });

  const [id] = await db('projects').insert(parseResult.data);
  await db('project_members').insert({ projectId: id, userId: req.user.id, membershipRole: 'admin' });

  const project = await db('projects').where({ id }).first();
  res.status(201).json(await projectWithMembers(project));
});

router.post('/:projectId/team', requireRole('admin'), async (req, res) => {
  const projectId = Number(req.params.projectId);
  const parseResult = projectMemberSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });

  const { userId, membershipRole } = parseResult.data;
  const project = await db('projects').where({ id: projectId }).first();
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const user = await db('users').where({ id: userId }).first();
  if (!user) return res.status(404).json({ error: 'User not found' });

  await db('project_members').insert({ projectId, userId, membershipRole }).onConflict(['projectId', 'userId']).merge();
  res.status(201).json({ projectId, userId, membershipRole });
});

router.get('/:projectId/team', async (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = await db('projects').where({ id: projectId }).first();
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role === 'member') {
    const membership = await db('project_members').where({ projectId, userId: req.user.id }).first();
    if (!membership) return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(await projectWithMembers(project));
});

module.exports = router;
