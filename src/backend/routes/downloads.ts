import { Router } from 'express';
import { downloadTrackFromTidal, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads, getCoverDownloads } from '../controllers/downloads';

const downloadsRouter = Router();

downloadsRouter.get('/', getdownloads);
downloadsRouter.delete('/', clearDownloads);
downloadsRouter.delete('/:id', deleteDownload);
downloadsRouter.get('/completed', getCompletedDownloads);
downloadsRouter.get('/completed-cover', getCoverDownloads);
downloadsRouter.get('/stream', streamDownload);
downloadsRouter.post('/tidal', downloadTrackFromTidal);
downloadsRouter.post('/finalize', finalizeDownload);
downloadsRouter.post('/metadata', writeMetadataParts);

export default downloadsRouter;
