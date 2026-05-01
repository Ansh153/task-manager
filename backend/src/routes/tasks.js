const express = require('express');
const { db } = require('../../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { taskSchema, taskUpdateSchema } = require('../validators');

const router = express.Router();

router.use(authMiddleware);

function taskSelect() {
  return db('tasks')
    .select('tasks.*', 'users.username as assigneeName', 'projects.name as projectName')
    .leftJoin('users', 'tasks.assigneeId', 'users.id')
    .leftJoin('projects', 'tasks.projectId', 'projects.id');
}

async function canAccessProject(user, projectId) {
  if (user.role === 'admin') return true;

  const membership = await db('project_members').where({ projectId, userId: user.id }).first();
  return Boolean(membership);
}

async function getTaskWithDetails(id) {
  return taskSelect().where('tasks.id', id).first();
}

router.get('/', async (req, res) => {
  const query = taskSelect().orderBy('tasks.createdAt', 'desc');

  if (req.user.role === 'member') {
    query.where((qb) => {
      qb.where('tasks.assigneeId', req.user.id).orWhereExists(function () {
        this.select('*').from('project_members').whereRaw('project_members.projectId = tasks.projectId').andWhere('project_members.userId', req.user.id);
      });
    });
  }

  const tasks = await query;
  res.json(tasks);
});

router.post('/', async (req, res) => {
  const parseResult = taskSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });

  const data = parseResult.data;
  const project = await db('projects').where({ id: data.projectId }).first();
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (!(await canAccessProject(req.user, data.projectId))) {
    return res.status(403).json({ error: 'Members can only create tasks inside their assigned projects' });
  }

  if (data.assigneeId) {
    const assignee = await db('users').where({ id: data.assigneeId }).first();
    if (!assignee) return res.status(404).json({ error: 'Assignee not found' });
  }

  if (req.user.role === 'admin' && data.assigneeId) {
    const membership = await db('project_members').where({ projectId: data.projectId, userId: data.assigneeId }).first();
    if (!membership) return res.status(400).json({ error: 'Assignee must be a member of the selected project' });
  }

  if (req.user.role === 'member' && data.assigneeId && data.assigneeId !== req.user.id) {
    return res.status(403).json({ error: 'Members can only assign tasks to themselves' });
  }

  if (req.user.role === 'member' && data.assigneeId !== req.user.id) {
    data.assigneeId = req.user.id;
  }

  const [id] = await db('tasks').insert(data);
  const task = await getTaskWithDetails(id);
  res.status(201).json(task);
});

router.put('/:id', async (req, res) => {
  const taskId = Number(req.params.id);
  const task = await db('tasks').where({ id: taskId }).first();
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role === 'member' && task.assigneeId !== req.user.id) {
    return res.status(403).json({ error: 'Members may only update their own tasks' });
  }

  const parseResult = taskUpdateSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.errors });

  const updates = parseResult.data;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid task updates were provided' });
  }

  if (req.user.role === 'member' && updates.assigneeId !== undefined && updates.assigneeId !== req.user.id) {
    return res.status(403).json({ error: 'Members may not reassign tasks' });
  }

  if (updates.assigneeId) {
    const assignee = await db('users').where({ id: updates.assigneeId }).first();
    if (!assignee) return res.status(404).json({ error: 'Assignee not found' });

    const membership = await db('project_members').where({ projectId: task.projectId, userId: updates.assigneeId }).first();
    if (!membership) return res.status(400).json({ error: 'Assignee must be a member of the task project' });
  }

  await db('tasks').where({ id: taskId }).update(updates);
  const updated = await getTaskWithDetails(taskId);
  res.json(updated);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const taskId = Number(req.params.id);
  await db('tasks').where({ id: taskId }).del();
  res.status(204).send();
});

module.exports = router;
