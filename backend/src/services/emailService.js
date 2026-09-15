const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * Real transactional email via any SMTP provider. Configure with the
 * generic SMTP_HOST/PORT/USER/PASS env vars — this works unmodified
 * with Resend's SMTP relay (host: smtp.resend.com, port: 465, user:
 * "resend", pass: your API key), Brevo, Mailgun, or any other SMTP
 * provider. See docs/DEPLOYMENT.md for exact setup steps.
 *
 * If SMTP_HOST is not configured (local dev by default), every send
 * function falls back to logging the content to the console instead
 * of silently pretending an email was sent — see the DEV EMAIL logs
 * already used elsewhere in the auth/invitation controllers.
 */

let transporter = null;
function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[DEV EMAIL] (SMTP not configured) To: ${to} | Subject: ${subject}`);
    return { delivered: false, reason: 'SMTP not configured' };
  }

  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html, text });
    return { delivered: true };
  } catch (err) {
    // A failed send must never be reported as success to the caller —
    // auth flows depend on knowing whether the link actually went out.
    logger.error(`[Email] Failed to send "${subject}" to ${to}: ${err.message}`);
    return { delivered: false, reason: err.message };
  }
}

function button(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#0F9D74;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">${label}</a>`;
}

async function sendVerificationEmail(user, verifyUrl) {
  return sendMail({
    to: user.email,
    subject: 'Verify your BuildFlow email',
    html: `<p>Hi ${user.name},</p><p>Confirm your email address to finish setting up your BuildFlow account.</p><p>${button(verifyUrl, 'Verify email')}</p><p>Or paste this link: ${verifyUrl}</p><p>This link expires in ${env.emailVerificationExpiresHours} hours.</p>`,
    text: `Verify your email: ${verifyUrl}`,
  });
}

async function sendPasswordResetEmail(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: 'Reset your BuildFlow password',
    html: `<p>Hi ${user.name},</p><p>We received a request to reset your password.</p><p>${button(resetUrl, 'Reset password')}</p><p>Or paste this link: ${resetUrl}</p><p>This link expires in ${env.resetTokenExpiresMin} minutes. If you didn't request this, you can safely ignore this email.</p>`,
    text: `Reset your password: ${resetUrl}`,
  });
}

async function sendInvitationEmail({ email, projectName, inviterName, role, inviteUrl }) {
  return sendMail({
    to: email,
    subject: `${inviterName} invited you to "${projectName}" on BuildFlow`,
    html: `<p>${inviterName} invited you to join <strong>${projectName}</strong> as <strong>${role}</strong>.</p><p>${button(inviteUrl, 'View invitation')}</p><p>Or paste this link: ${inviteUrl}</p>`,
    text: `${inviterName} invited you to ${projectName} as ${role}: ${inviteUrl}`,
  });
}

module.exports = { sendMail, sendVerificationEmail, sendPasswordResetEmail, sendInvitationEmail };
