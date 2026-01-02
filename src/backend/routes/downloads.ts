import { Router } from 'express';
import { downloadTrackFromTidal, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads, getCoverDownloads, writeCoverFromUrl } from '../controllers/downloads';

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
downloadsRouter.post('/metadata-cover', writeCoverFromUrl);

export default downloadsRouter;
