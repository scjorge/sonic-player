import { Router } from 'express';
import { downloadTrack, getdownloads, getCompletedDownloads, streamDownload, retryDownload } from '../controllers/tidal';


const router = Router();

router.get('/downloads', getdownloads);
router.get('/downloads/completed', getCompletedDownloads);
router.get('/downloads/stream', streamDownload);
router.post('/download', downloadTrack);
router.post('/downloads/retry', retryDownload);

export default router;
