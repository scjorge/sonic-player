import { Router } from 'express';
import { getYoutubeSettings, saveYoutubeSettings, clearYoutubeSettings } from '../controllers/youtubeSettings';

const youtubeSettingsRouter = Router();

youtubeSettingsRouter.get('/', getYoutubeSettings);
youtubeSettingsRouter.put('/', saveYoutubeSettings);
youtubeSettingsRouter.delete('/', clearYoutubeSettings);

export default youtubeSettingsRouter;
