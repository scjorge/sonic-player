import { Router } from 'express';
import { getSpotifySettings, saveSpotifySettings } from '../controllers/spotifySettings';

const spotifySettingsRouter = Router();

spotifySettingsRouter.get('/', getSpotifySettings);
spotifySettingsRouter.put('/', saveSpotifySettings);

export default spotifySettingsRouter;
