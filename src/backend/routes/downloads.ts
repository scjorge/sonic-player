import { Router } from 'express';
import multer from 'multer';
import { downloadTrackFromTidal, downloadTrackFromSpotDL, getdownloads, getCompletedDownloads, streamDownload, writeMetadataParts, finalizeDownload, deleteDownload, clearDownloads, getCoverDownloads, writeCoverFromUrl, uploadPreparation, convertDownload, deletePreparation, generateSpectrogram } from '../controllers/downloads';
import { PREPARATION_PATH } from '../config';

const downloadsRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PREPARATION_PATH);
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
downloadsRouter.post('/delete-preparation', deletePreparation);
downloadsRouter.post('/spectrogram', generateSpectrogram);

export default downloadsRouter;
