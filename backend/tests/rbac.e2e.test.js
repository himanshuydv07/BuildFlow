require('./setup');
const request = require('supertest');
const app = require('../src/app');

const api = request(app);
const base = '/api/v1';

async function registerAndLogin(name, email) {
  const res = await api.post(`${base}/auth/register`).send({ name, email, password: 'Password123!' });
  return { accessToken: res.body.data.accessToken, user: res.body.data.user };
}

describe('Project-scoped RBAC — critical multi-user workflow', () => {
  let userA, userB, projectAId, taskId, memberBId;

  test('User A registers and creates Project A, becoming OWNER', async () => {
    userA = await registerAndLogin('User A', 'usera@test.dev');
    const res = await api
      .post(`${base}/projects`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'Project A' });
    expect(res.status).toBe(201);
    projectAId = res.body.data.project._id;

    const getRes = await api
      .get(`${base}/projects/${projectAId}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(getRes.body.data.myRole).toBe('OWNER');
  });

  test('User B registers; User A invites and User B accepts as MEMBER', async () => {
    userB = await registerAndLogin('User B', 'userb@test.dev');

    const inviteRes = await api
      .post(`${base}/projects/${projectAId}/invitations`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ email: 'userb@test.dev', role: 'MEMBER' });
    expect(inviteRes.status).toBe(201);

    // Simulate reading the invite token the way the dev-mode logger would
    // expose it: fetch the raw invitation from Mongo directly isn't
    // available over HTTP, so instead exercise the "list my invitations"
    // + accept flow using the token embedded server-side. For this test
    // we reach into the invitation doc via a second dev-only lookup route
    // is not exposed; instead we accept using the invitation id and the
    // fact that acceptInvitation validates token — so we recompute it
    // is not possible from the test. We therefore invite, then fetch the
    // pending invitation id via listMyInvitations and accept using the
    // known raw token intercepted from the mongo document directly.
    const Invitation = require('../src/models/Invitation');
    const invDoc = await Invitation.findOne({ email: 'userb@test.dev' }).select('+tokenHash');
    const invId = invDoc._id.toString();

    // Since we can't recover the raw token from its hash, re-issue via
    // the controller's own accept path is not testable without the raw
    // token. For test purposes we bypass by regenerating the invite
    // with a known token through the model directly.
    const { hashToken } = require('../src/utils/tokens');
    const rawToken = 'test-fixed-token';
    invDoc.tokenHash = hashToken(rawToken);
    await invDoc.save();

    const acceptRes = await api
      .post(`${base}/invitations/${invId}/accept`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ token: rawToken });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.role).toBe('MEMBER');
  });

  test('User A creates a task and assigns it to User B', async () => {
    const membersRes = await api
      .get(`${base}/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    const bMembership = membersRes.body.data.members.find((m) => m.userId.email === 'userb@test.dev');
    memberBId = bMembership._id;

    const taskRes = await api
      .post(`${base}/projects/${projectAId}/tasks`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ title: 'Implement login', assignee: bMembership.userId._id });
    expect(taskRes.status).toBe(201);
    taskId = taskRes.body.data.task._id;
  });

  test('User B sees and updates the assigned task status', async () => {
    const listRes = await api
      .get(`${base}/my-tasks`)
      .set('Authorization', `Bearer ${userB.accessToken}`);
    expect(listRes.body.data.tasks.some((t) => t._id === taskId)).toBe(true);

    const statusRes = await api
      .patch(`${base}/projects/${projectAId}/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.task.status).toBe('IN_PROGRESS');
  });

  test('User B creates their own Project B and becomes OWNER there, while remaining MEMBER in Project A', async () => {
    const projectBRes = await api
      .post(`${base}/projects`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ name: 'Project B' });
    const projectBId = projectBRes.body.data.project._id;

    const bInA = await api
      .get(`${base}/projects/${projectAId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);
    expect(bInA.body.data.myRole).toBe('MEMBER');

    const bInB = await api
      .get(`${base}/projects/${projectBId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);
    expect(bInB.body.data.myRole).toBe('OWNER');

    // Critical assertion: User A has NO access to Project B at all.
    const aInB = await api
      .get(`${base}/projects/${projectBId}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(aInB.status).toBe(404);
  });

  test('MEMBER cannot access admin-only endpoints (invite members)', async () => {
    const res = await api
      .post(`${base}/projects/${projectAId}/invitations`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ email: 'someoneelse@test.dev', role: 'MEMBER' });
    expect(res.status).toBe(403);
  });

  test('MEMBER cannot change their own role', async () => {
    const res = await api
      .patch(`${base}/projects/${projectAId}/members/${memberBId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ role: 'ADMIN' });
    // User B is not OWNER/ADMIN so requireProjectRole rejects before
    // the self-role-change check is even reached.
    expect(res.status).toBe(403);
  });
});
