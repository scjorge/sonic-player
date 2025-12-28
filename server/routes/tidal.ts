import { Router } from 'express';
import { downloadTrack, getdownloads, getCompletedDownloads, streamDownload } from '../controllers/tidal';


const router = Router();

router.get('/downloads', getdownloads);
router.get('/downloads/completed', getCompletedDownloads);
router.get('/downloads/stream', streamDownload);
router.post('/download', downloadTrack);

export default router;
