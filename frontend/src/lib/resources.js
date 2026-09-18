import api from './apiClient';

export const authApi = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (body) => api.post('/auth/change-password', body),
  forgotPassword: (body) => api.post('/auth/forgot-password', body),
  resetPassword: (body) => api.post('/auth/reset-password', body),
  deleteAccount: (password) => api.delete('/auth/me', { data: { password } }),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (body) => api.post('/projects', body),
  update: (id, body) => api.patch(`/projects/${id}`, body),
  archive: (id) => api.delete(`/projects/${id}`),
  transferOwnership: (id, newOwnerId) => api.post(`/projects/${id}/transfer-ownership`, { newOwnerId }),
  dashboard: (id) => api.get(`/projects/${id}/dashboard`),
};

export const membersApi = {
  list: (projectId) => api.get(`/projects/${projectId}/members`),
  updateRole: (projectId, memberId, role) => api.patch(`/projects/${projectId}/members/${memberId}`, { role }),
  remove: (projectId, memberId) => api.delete(`/projects/${projectId}/members/${memberId}`),
  leave: (projectId) => api.post(`/projects/${projectId}/members/leave`),
};

export const invitationsApi = {
  create: (projectId, body) => api.post(`/projects/${projectId}/invitations`, body),
  listForProject: (projectId) => api.get(`/projects/${projectId}/invitations`),
  cancel: (projectId, invitationId) => api.delete(`/projects/${projectId}/invitations/${invitationId}`),
  listMine: () => api.get('/invitations/me'),
  accept: (invitationId, token) => api.post(`/invitations/${invitationId}/accept`, { token }),
  reject: (invitationId) => api.post(`/invitations/${invitationId}/reject`),
};

export const tasksApi = {
  list: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  get: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, body) => api.post(`/projects/${projectId}/tasks`, body),
  update: (projectId, taskId, body) => api.patch(`/projects/${projectId}/tasks/${taskId}`, body),
  remove: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
  updateStatus: (projectId, taskId, status) => api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status }),
  updateProgress: (projectId, taskId, progress) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}/progress`, { progress }),
  addChecklistItem: (projectId, taskId, text) =>
    api.post(`/projects/${projectId}/tasks/${taskId}/checklist`, { text }),
  toggleChecklistItem: (projectId, taskId, itemId, done) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`, { done }),
  logTime: (projectId, taskId, hours) => api.post(`/projects/${projectId}/tasks/${taskId}/log-time`, { hours }),
  startTimer: (projectId, taskId) => api.post(`/projects/${projectId}/tasks/${taskId}/timer/start`),
  stopTimer: (projectId, taskId) => api.post(`/projects/${projectId}/tasks/${taskId}/timer/stop`),
  myTasks: (params) => api.get('/my-tasks', { params }),
};

export const milestonesApi = {
  list: (projectId) => api.get(`/projects/${projectId}/milestones`),
  get: (projectId, milestoneId) => api.get(`/projects/${projectId}/milestones/${milestoneId}`),
  create: (projectId, body) => api.post(`/projects/${projectId}/milestones`, body),
  update: (projectId, milestoneId, body) => api.patch(`/projects/${projectId}/milestones/${milestoneId}`, body),
  remove: (projectId, milestoneId) => api.delete(`/projects/${projectId}/milestones/${milestoneId}`),
};

export const commentsApi = {
  list: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}/comments`),
  create: (projectId, taskId, body) => api.post(`/projects/${projectId}/tasks/${taskId}/comments`, body),
  update: (projectId, taskId, commentId, content) =>
    api.patch(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, { content }),
  remove: (projectId, taskId, commentId) => api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const activityApi = {
  list: (projectId, params) => api.get(`/projects/${projectId}/activity`, { params }),
  listMine: (params) => api.get('/activity', { params }),
};

export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }),
};

export const templatesApi = {
  list: () => api.get('/projects/templates'),
};

export const filesApi = {
  list: (projectId, params) => api.get(`/projects/${projectId}/files`, { params }),
  upload: (projectId, formData) =>
    api.post(`/projects/${projectId}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadUrl: (projectId, fileId) => `${api.defaults.baseURL}/projects/${projectId}/files/${fileId}/download`,
  remove: (projectId, fileId) => api.delete(`/projects/${projectId}/files/${fileId}`),
};

export const notesApi = {
  listPersonal: () => api.get('/notes'),
  createPersonal: (body) => api.post('/notes', body),
  listProject: (projectId) => api.get(`/projects/${projectId}/notes`),
  createProject: (projectId, body) => api.post(`/projects/${projectId}/notes`, body),
  update: (noteId, body) => api.patch(`/notes/${noteId}`, body),
  remove: (noteId) => api.delete(`/notes/${noteId}`),
};

export const savedViewsApi = {
  list: (projectId) => api.get(`/projects/${projectId}/saved-views`),
  create: (projectId, body) => api.post(`/projects/${projectId}/saved-views`, body),
  remove: (projectId, viewId) => api.delete(`/projects/${projectId}/saved-views/${viewId}`),
};

export const analyticsApi = {
  get: (projectId) => api.get(`/projects/${projectId}/analytics`),
};

export const reportsApi = {
  summary: (projectId) => api.get(`/projects/${projectId}/reports/summary`),
  exportCsvUrl: (projectId) => `${api.defaults.baseURL}/projects/${projectId}/reports/export.csv`,
};

export const sprintsApi = {
  list: (projectId) => api.get(`/projects/${projectId}/sprints`),
  create: (projectId, body) => api.post(`/projects/${projectId}/sprints`, body),
  update: (projectId, sprintId, body) => api.patch(`/projects/${projectId}/sprints/${sprintId}`, body),
  board: (projectId, sprintId) => api.get(`/projects/${projectId}/sprints/${sprintId}/board`),
};

export const epicsApi = {
  list: (projectId) => api.get(`/projects/${projectId}/epics`),
  create: (projectId, body) => api.post(`/projects/${projectId}/epics`, body),
  remove: (projectId, epicId) => api.delete(`/projects/${projectId}/epics/${epicId}`),
};

export const recurringTasksApi = {
  list: (projectId) => api.get(`/projects/${projectId}/recurring-tasks`),
  create: (projectId, body) => api.post(`/projects/${projectId}/recurring-tasks`, body),
  remove: (projectId, id) => api.delete(`/projects/${projectId}/recurring-tasks/${id}`),
};

export const assistantApi = {
  ask: (projectId, query) => api.post(`/projects/${projectId}/assistant/query`, { query }),
};
