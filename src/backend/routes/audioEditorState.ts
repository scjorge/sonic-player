import { Router } from 'express';
import { getAudioEditorState, saveAudioEditorState } from '../controllers/audioEditorState';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getAudioEditorState);
router.post('/', authMiddleware, saveAudioEditorState);

export default router;
