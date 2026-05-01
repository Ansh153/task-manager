# Team Task Manager

A full-stack Team Task Manager assignment app where users can create projects, manage teams, assign tasks, and track progress with Admin/Member role-based access.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express REST APIs
- Database: SQLite with Knex
- Auth: JWT + bcrypt password hashing
- Validation: Zod request schemas

## Features

- Signup and login with JWT authentication
- Admin and Member roles
- Admin project creation
- Project team membership management
- Task creation with project relationship, assignee, status, due date, and description
- Task status tracking: `todo`, `in-progress`, `done`
- Dashboard counts for projects, total tasks, open tasks, and overdue tasks
- Members only see projects they belong to and tasks assigned to them or inside their projects
- Admins can view users, assign project teams, assign tasks, reassign tasks, and delete tasks

## Database Relationships

- `users`: stores username, password hash, and global role
- `projects`: stores project name and description
- `project_members`: many-to-many relationship between users and projects
- `tasks`: belongs to a project and can be assigned to a user

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the backend and frontend together:
```bash
npm run dev
```

3. Open the frontend app:
```text
http://localhost:5173
```

The backend runs at:
```text
http://localhost:4000
```

## Demo Login

The database seeds an admin account:

```text
Username: admin
Password: admin123
Role: admin
```

You can also create new users from the signup screen.

## REST API

Protected routes require:

```text
Authorization: Bearer <token>
```

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`

### Users

- `GET /api/users` - admin only

### Projects

- `GET /api/projects`
- `POST /api/projects` - admin only
- `GET /api/projects/:projectId/team`
- `POST /api/projects/:projectId/team` - admin only

### Tasks

- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id` - admin only

## Validation And Access Rules

- Usernames must be at least 3 characters.
- Passwords must be at least 6 characters.
- Projects require a valid name.
- Tasks require a valid project and title.
- Due dates must use `YYYY-MM-DD`.
- Admins can manage every project and task.
- Members can only create tasks inside assigned projects.
- Members can only assign tasks to themselves.
- Members can only update their own assigned tasks.
- Assignees must belong to the selected task project.

## Verification

Run a production frontend build:

```bash
npm run build --workspace frontend
```

Or run the same build command used by Vercel from the repo root:

```bash
npm run build
```

Start only the backend:

```bash
npm run start --workspace backend
```

## Vercel Deployment

This repo is a monorepo, so `vercel.json` tells Vercel to build the nested Vite frontend and serve `frontend/dist`.

Use these settings:

- Root Directory: repository root
- Build Command: `npm run build --workspace frontend`
- Output Directory: `frontend/dist`
- Environment Variable: `VITE_API_BASE_URL=<your deployed backend URL>/api`

The current Express + SQLite backend is designed for local/Node server hosting. Deploy the backend separately on a persistent Node host, or migrate it to Vercel serverless functions plus a hosted database.

## Railway Deployment

Railway is a good fit for this version because the app now runs as one Node service:

- `npm run build` builds the React frontend into `frontend/dist`.
- `npm start` runs Express.
- Express serves `/api/*` from the backend and serves the built React app for browser routes.
- `railway.json` configures the build command, start command, and `/api/health` healthcheck.

Recommended Railway setup:

1. Push this repository to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Deploy from the repository root.
4. Add these variables:

```text
JWT_SECRET=<a long random secret>
NODE_ENV=production
```

5. For persistent SQLite data, add a Railway Volume to the web service.
6. Mount the volume and set:

```text
SQLITE_FILENAME=/data/database.sqlite3
```

If your Railway volume mount path is not `/data`, use the actual mount path shown in Railway. Without a volume, SQLite data may be lost when the service is rebuilt or restarted.

After deployment, open:

```text
https://your-service.up.railway.app/api/health
```

It should return:

```json
{ "status": "ok" }
```
