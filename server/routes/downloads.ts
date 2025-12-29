import { Router } from 'express';
import { downloadTrackFromTidal, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads } from '../controllers/downloads';

const downloadsRouter = Router();

downloadsRouter.get('/', getdownloads);
downloadsRouter.post('/', downloadTrackFromTidal);
downloadsRouter.delete('/', clearDownloads);
downloadsRouter.delete('/:id', deleteDownload);
downloadsRouter.get('/completed', getCompletedDownloads);
downloadsRouter.get('/stream', streamDownload);
downloadsRouter.post('/finalize', finalizeDownload);
downloadsRouter.post('/metadata', writeMetadataParts);

export default downloadsRouter;
