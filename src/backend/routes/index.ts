import { Router } from 'express';
import downloadsRouter from './downloads';
import navidromeRouter from './navidrome';
import spotifySettingsRouter from './spotifySettings';
import tagGroupsRouter from './tagGroups';
import genresRouter from './genres';
import shazamRouter from './shazam';
import youtubeSettingsRouter from './youtubeSettings';
import generalSettingsRouter from './generalSettings';

const router = Router();

router.use('/downloads', downloadsRouter);
router.use('/navidrome', navidromeRouter);
router.use('/spotify-settings', spotifySettingsRouter);
router.use('/tag-groups', tagGroupsRouter);
router.use('/genres', genresRouter);
router.use('/shazam', shazamRouter);
router.use('/youtube-settings', youtubeSettingsRouter);
router.use('/general-settings', generalSettingsRouter);

export default router;

