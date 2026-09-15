// Global note routes: create/list personal notes, and update/delete
// shared by both personal and project notes (author-only, checked in
// the controller since a note's projectId already scopes visibility).
const express = require('express');
const controller = require('../controllers/note.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/note.validators');

const router = express.Router();
router.use(requireAuth);

router.post('/', validate({ body: v.createNoteSchema }), controller.createPersonalNote);
router.get('/', controller.listPersonalNotes);
router.patch('/:noteId', validate({ params: v.noteIdParams, body: v.updateNoteSchema }), controller.updateNote);
router.delete('/:noteId', validate({ params: v.noteIdParams }), controller.deleteNote);

module.exports = router;
