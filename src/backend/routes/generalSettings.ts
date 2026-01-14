import { Router } from 'express';
import { getGeneralSettings, saveGeneralSettings } from '../controllers/generalSettings';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getGeneralSettings);
router.post('/', authMiddleware, saveGeneralSettings);

export default router;
