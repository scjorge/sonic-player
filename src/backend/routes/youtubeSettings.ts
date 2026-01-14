import { Router } from 'express';
import { getYoutubeSettings, saveYoutubeSettings, clearYoutubeSettings } from '../controllers/youtubeSettings';
import { authMiddleware } from '../middleware/auth';

const youtubeSettingsRouter = Router();

youtubeSettingsRouter.get('/', authMiddleware, getYoutubeSettings);
youtubeSettingsRouter.put('/', authMiddleware, saveYoutubeSettings);
youtubeSettingsRouter.delete('/', authMiddleware, clearYoutubeSettings);

export default youtubeSettingsRouter;
