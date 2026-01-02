import { Router } from 'express';
import multer from 'multer';
import { downloadTrackFromTidal, downloadTrackFromSpotDL, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads, getCoverDownloads, writeCoverFromUrl, uploadPreparation, convertDownload } from '../controllers/downloads';
import { NAVIDROME_PREPARATION_PATH } from '../../core/config';

const downloadsRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, NAVIDROME_PREPARATION_PATH);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

downloadsRouter.get('/', getdownloads);
downloadsRouter.delete('/', clearDownloads);
downloadsRouter.delete('/:id', deleteDownload);
downloadsRouter.get('/completed', getCompletedDownloads);
downloadsRouter.get('/completed-cover', getCoverDownloads);
downloadsRouter.get('/stream', streamDownload);
downloadsRouter.post('/tidal', downloadTrackFromTidal);
downloadsRouter.post('/spotdl', downloadTrackFromSpotDL);
downloadsRouter.post('/finalize', finalizeDownload);
downloadsRouter.post('/metadata', writeMetadataParts);
downloadsRouter.post('/metadata-cover', writeCoverFromUrl);
downloadsRouter.post('/upload-preparation', upload.array('files'), uploadPreparation);
downloadsRouter.post('/convert', convertDownload);

export default downloadsRouter;
