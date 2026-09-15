const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Note = require('../models/Note');

// POST /notes  (personal, no project)
const createPersonalNote = asyncHandler(async (req, res) => {
  const note = await Note.create({ ...req.body, author: req.user._id, projectId: null });
  return new ApiResponse(201, { note }, 'Note created').send(res);
});

// GET /notes  (personal only)
const listPersonalNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ author: req.user._id, projectId: null }).sort({ updatedAt: -1 }).lean();
  return new ApiResponse(200, { notes }).send(res);
});

// POST /projects/:projectId/notes  (any active member except VIEWER)
const createProjectNote = asyncHandler(async (req, res) => {
  if (req.membership.role === 'VIEWER') throw ApiError.forbidden('Viewers cannot create notes');
  const note = await Note.create({ ...req.body, author: req.user._id, projectId: req.project._id });
  await note.populate('author', 'name avatarUrl');
  return new ApiResponse(201, { note }, 'Note created').send(res);
});

// GET /projects/:projectId/notes  (any active member)
const listProjectNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ projectId: req.project._id }).populate('author', 'name avatarUrl').sort({ updatedAt: -1 }).lean();
  return new ApiResponse(200, { notes }).send(res);
});

// Shared update/delete for both personal and project notes — author only.
const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.noteId);
  if (!note) throw ApiError.notFound('Note not found');
  if (note.author.toString() !== req.user._id.toString()) throw ApiError.forbidden('You can only edit your own notes');

  Object.assign(note, req.body);
  await note.save();
  return new ApiResponse(200, { note }, 'Note updated').send(res);
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.noteId);
  if (!note) throw ApiError.notFound('Note not found');
  if (note.author.toString() !== req.user._id.toString()) throw ApiError.forbidden('You can only delete your own notes');

  await note.deleteOne();
  return new ApiResponse(200, null, 'Note deleted').send(res);
});

module.exports = { createPersonalNote, listPersonalNotes, createProjectNote, listProjectNotes, updateNote, deleteNote };
