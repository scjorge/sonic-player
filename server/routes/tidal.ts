import { Router } from 'express';
import { downloadTrack, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads } from '../controllers/tidal';


const router = Router();

router.get('/downloads', getdownloads);
router.get('/downloads/completed', getCompletedDownloads);
router.get('/downloads/stream', streamDownload);
router.post('/download', downloadTrack);
router.post('/downloads/finalize', finalizeDownload);
router.delete('/downloads/:id', deleteDownload);
router.delete('/downloads', clearDownloads);

router.post('/metadata', writeMetadataParts);


export default router;
