const knex = require('knex');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const config = require('./knexfile');

const sqliteFilename = config.development.connection.filename;
fs.mkdirSync(path.dirname(sqliteFilename), { recursive: true });

const db = knex(config.development);

async function migrateSchema() {
  await db.schema.hasTable('users').then(async (exists) => {
    if (!exists) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').notNullable().unique();
        table.string('passwordHash').notNullable();
        table.string('role').notNullable().defaultTo('member');
        table.timestamp('createdAt').defaultTo(db.fn.now());
      });
    }
  });

  await db.schema.hasTable('projects').then(async (exists) => {
    if (!exists) {
      await db.schema.createTable('projects', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('description').defaultTo('');
        table.timestamp('createdAt').defaultTo(db.fn.now());
      });
    }
  });

  await db.schema.hasTable('project_members').then(async (exists) => {
    if (!exists) {
      await db.schema.createTable('project_members', (table) => {
        table.integer('projectId').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
        table.integer('userId').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('membershipRole').notNullable().defaultTo('member');
        table.primary(['projectId', 'userId']);
      });
    }
  });

  await db.schema.hasTable('tasks').then(async (exists) => {
    if (!exists) {
      await db.schema.createTable('tasks', (table) => {
        table.increments('id').primary();
        table.integer('projectId').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
        table.string('title').notNullable();
        table.text('description').defaultTo('');
        table.string('status').notNullable().defaultTo('todo');
        table.integer('assigneeId').unsigned().references('id').inTable('users').onDelete('SET NULL');
        table.date('dueDate');
        table.timestamp('createdAt').defaultTo(db.fn.now());
      });
    }
  });

  await seedInitialData();
}

async function seedInitialData() {
  const sampleProjectNames = [
    'Website Redesign',
    'Mobile App Launch',
    'Customer Onboarding',
    'Marketing Campaign',
    'Sales Pipeline Review',
    'Product Roadmap',
    'Feature Discovery',
    'Quality Assurance',
    'User Research',
    'Release Preparation',
    'Backend Refactor',
    'Infrastructure Upgrade',
    'Support Process Update',
    'Security Audit',
    'Data Migration'
  ];

  const existingProjects = await db('projects').select('name');
  const existingNames = new Set(existingProjects.map((project) => project.name));
  const newSampleProjects = sampleProjectNames
    .filter((name) => !existingNames.has(name))
    .map((name) => ({ name, description: `${name} tasks and milestones.` }));

  if (newSampleProjects.length > 0) {
    await db('projects').insert(newSampleProjects);
  }

  const userCount = await db('users').count({ count: 'id' }).first();
  if (Number(userCount.count) === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db('users').insert({ username: 'admin', passwordHash, role: 'admin' });
  }

  const projectMembershipCount = await db('project_members').count({ count: 'projectId' }).first();
  if (Number(projectMembershipCount.count) === 0) {
    const users = await db('users').select('id', 'role');
    const projects = await db('projects').select('id');
    if (users.length > 0 && projects.length > 0) {
      const memberships = [];
      users.forEach((user) => {
        projects.forEach((project) => {
          memberships.push({
            projectId: project.id,
            userId: user.id,
            membershipRole: user.role === 'admin' ? 'admin' : 'member'
          });
        });
      });
      await db('project_members').insert(memberships).onConflict(['projectId', 'userId']).ignore();
    }
  }

  const taskCount = await db('tasks').count({ count: 'id' }).first();
  if (Number(taskCount.count) === 0) {
    const projects = await db('projects').select('id');
    const sampleTasks = [
      { title: 'Define homepage wireframes', status: 'todo', dueDate: addDays(5) },
      { title: 'Implement mobile signup flow', status: 'in-progress', dueDate: addDays(7) },
      { title: 'Collect onboarding checklist', status: 'todo', dueDate: addDays(4) },
      { title: 'Draft campaign messaging', status: 'in-progress', dueDate: addDays(6) },
      { title: 'Review sales forecast', status: 'todo', dueDate: addDays(3) },
      { title: 'Plan sprint goals', status: 'done', dueDate: addDays(-1) },
      { title: 'Map product roadmap', status: 'todo', dueDate: addDays(10) },
      { title: 'Capture customer feedback', status: 'in-progress', dueDate: addDays(2) },
      { title: 'Perform QA regression', status: 'todo', dueDate: addDays(8) },
      { title: 'Run user interview sessions', status: 'todo', dueDate: addDays(9) }
    ];

    const tasksWithProjects = sampleTasks.map((task, index) => ({
      ...task,
      projectId: projects[index % projects.length].id,
      description: `${task.title} for the project.`
    }));

    await db('tasks').insert(tasksWithProjects);
  }
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

module.exports = { db, migrateSchema };
