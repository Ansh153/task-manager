const { z } = require('zod');

const idSchema = z.coerce.number().int().positive();

const signupSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(100)
});

const loginSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(100)
});

const projectSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional()
});

const taskSchema = z.object({
  projectId: idSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1200).optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  assigneeId: idSchema.nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

const taskUpdateSchema = taskSchema.partial().omit({ projectId: true });

const projectMemberSchema = z.object({
  userId: idSchema,
  membershipRole: z.enum(['admin', 'member']).default('member')
});

module.exports = { signupSchema, loginSchema, projectSchema, taskSchema, taskUpdateSchema, projectMemberSchema };
