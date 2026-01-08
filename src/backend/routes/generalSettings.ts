import { Router } from 'express';
import { getGeneralSettings, saveGeneralSettings } from '../controllers/generalSettings';

const router = Router();

router.get('/', getGeneralSettings);
router.post('/', saveGeneralSettings);

export default router;
