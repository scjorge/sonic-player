import { Router } from 'express';
import { getSpotifySettings, saveSpotifySettings, clearSpotifySettings } from '../controllers/spotifySettings';

const spotifySettingsRouter = Router();

spotifySettingsRouter.get('/', getSpotifySettings);
spotifySettingsRouter.put('/', saveSpotifySettings);
spotifySettingsRouter.delete('/', clearSpotifySettings);

export default spotifySettingsRouter;
