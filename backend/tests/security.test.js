require('./setup');
const request = require('supertest');
const app = require('../src/app');

const api = request(app);
const base = '/api/v1';

describe('Security tests', () => {
  test('Unauthenticated request to a protected route is rejected', async () => {
    const res = await api.get(`${base}/dashboard`);
    expect(res.status).toBe(401);
  });

  test('Invalid/garbage access token is rejected', async () => {
    const res = await api.get(`${base}/dashboard`).set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('Accessing a nonexistent project returns 404, not a stack trace', async () => {
    const reg = await api.post(`${base}/auth/register`).send({
      name: 'Sec User',
      email: 'sec@test.dev',
      password: 'Password123!',
    });
    const token = reg.body.data.accessToken;

    const res = await api
      .get(`${base}/projects/64b7f9c9f9c9f9c9f9c9f9c9`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.stack).toBeUndefined(); // NODE_ENV=test but still shouldn't leak in this shape check
  });

  test('A user cannot access a project they are not a member of', async () => {
    const owner = await api.post(`${base}/auth/register`).send({
      name: 'Owner X',
      email: 'ownerx@test.dev',
      password: 'Password123!',
    });
    const stranger = await api.post(`${base}/auth/register`).send({
      name: 'Stranger',
      email: 'stranger@test.dev',
      password: 'Password123!',
    });

    const projectRes = await api
      .post(`${base}/projects`)
      .set('Authorization', `Bearer ${owner.body.data.accessToken}`)
      .send({ name: 'Private Project' });
    const projectId = projectRes.body.data.project._id;

    const res = await api
      .get(`${base}/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${stranger.body.data.accessToken}`);
    expect(res.status).toBe(404);
  });

  test('Registration rejects a weak/short password', async () => {
    const res = await api.post(`${base}/auth/register`).send({
      name: 'Weak Pw',
      email: 'weak@test.dev',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  test('Duplicate registration email is rejected', async () => {
    await api.post(`${base}/auth/register`).send({ name: 'Dup', email: 'dup@test.dev', password: 'Password123!' });
    const res = await api.post(`${base}/auth/register`).send({ name: 'Dup2', email: 'dup@test.dev', password: 'Password123!' });
    expect(res.status).toBe(409);
  });
});
