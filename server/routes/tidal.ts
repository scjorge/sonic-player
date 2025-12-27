import { Router } from 'express';
import { downloadTrack, getdownloads } from '../controllers/tidal.ts';


const router = Router();

router.get('/downloads', getdownloads);
router.post('/download', downloadTrack);

export default router;
