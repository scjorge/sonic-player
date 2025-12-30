import { Router } from 'express';
import downloadsRouter from './downloads';
import navidromeRouter from './navidrome';
import spotifySettingsRouter from './spotifySettings';
import tagGroupsRouter from './tagGroups';
import genresRouter from './genres';

const router = Router();

router.use('/downloads', downloadsRouter);
router.use('/navidrome', navidromeRouter);
router.use('/spotify-settings', spotifySettingsRouter);
router.use('/tag-groups', tagGroupsRouter);
router.use('/genres', genresRouter);

export default router;

