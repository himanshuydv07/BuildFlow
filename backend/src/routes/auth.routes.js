const express = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const v = require('../validators/auth.validators');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: v.registerSchema }), controller.register);
router.post('/login', authLimiter, validate({ body: v.loginSchema }), controller.login);
router.post('/refresh', authLimiter, controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);
router.post(
  '/change-password',
  requireAuth,
  validate({ body: v.changePasswordSchema }),
  controller.changePassword
);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: v.forgotPasswordSchema }),
  controller.forgotPassword
);
router.post('/reset-password', authLimiter, validate({ body: v.resetPasswordSchema }), controller.resetPassword);
router.post('/verify-email', validate({ body: v.verifyEmailSchema }), controller.verifyEmail);

module.exports = router;
