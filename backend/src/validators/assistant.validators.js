const { z } = require('zod');
const askSchema = z.object({ query: z.string().trim().min(2).max(500) });
module.exports = { askSchema };
