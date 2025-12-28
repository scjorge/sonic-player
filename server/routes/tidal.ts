import { Router } from 'express';
import { downloadTrack, getdownloads, getCompletedDownloads } from '../controllers/tidal';


const router = Router();

router.get('/downloads', getdownloads);
router.get('/downloads/completed', getCompletedDownloads);
router.post('/download', downloadTrack);

export default router;
