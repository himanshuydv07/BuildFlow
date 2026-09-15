const { z } = require('zod');
const { objectId } = require('./project.validators');

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(150),
  content: z.string().max(20000).optional().default(''),
  tags: z.array(z.string().max(30)).max(20).optional(),
});
const updateNoteSchema = createNoteSchema.partial();
const noteIdParams = z.object({ noteId: objectId });

module.exports = { createNoteSchema, updateNoteSchema, noteIdParams };
