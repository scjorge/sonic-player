import { Router } from 'express';
import { getSpotifySettings, saveSpotifySettings, clearSpotifySettings } from '../controllers/spotifySettings';
import { authMiddleware } from '../middleware/auth';

const spotifySettingsRouter = Router();

spotifySettingsRouter.get('/', authMiddleware, getSpotifySettings);
spotifySettingsRouter.put('/', authMiddleware, saveSpotifySettings);
spotifySettingsRouter.delete('/', authMiddleware, clearSpotifySettings);

export default spotifySettingsRouter;
