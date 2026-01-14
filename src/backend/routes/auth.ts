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

// Rotas de administrador
router.get('/users', authMiddleware, adminMiddleware, authController.listUsers);
router.patch('/users/:userId/status', authMiddleware, adminMiddleware, authController.toggleUserStatus);

export default router;
