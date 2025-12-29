import { Router } from 'express';
import { downloadTrack, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads } from '../controllers/tidal';


const router = Router();
const downloadsRouter = Router();

downloadsRouter.get('/', getdownloads);
downloadsRouter.post('/', downloadTrack);
downloadsRouter.delete('/', clearDownloads);
downloadsRouter.delete('/:id', deleteDownload);
downloadsRouter.get('/completed', getCompletedDownloads);
downloadsRouter.get('/stream', streamDownload);
downloadsRouter.post('/finalize', finalizeDownload);
downloadsRouter.post('/metadata', writeMetadataParts);

router.use('/downloads', downloadsRouter);


export default router;
