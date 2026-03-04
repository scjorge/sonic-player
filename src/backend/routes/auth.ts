import { Router } from 'express';
import * as authController from '../controllers/auth';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rotas protegidas
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/password', authMiddleware, authController.updatePassword);
router.put('/profile', authMiddleware, authController.updateProfile);

// Rotas de administrador
router.get('/users', authMiddleware, adminMiddleware, authController.listUsers);
router.post('/users', authMiddleware, adminMiddleware, authController.createUser);
router.patch('/users/:userId/status', authMiddleware, adminMiddleware, authController.toggleUserStatus);
router.put('/users/:userId', authMiddleware, adminMiddleware, authController.adminUpdateUser);
router.put('/users/:userId/reset-password', authMiddleware, adminMiddleware, authController.adminResetPassword);

export default router;
