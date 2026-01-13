import { Router } from 'express';
import { getAudioEditorState, saveAudioEditorState } from '../controllers/audioEditorState';

const router = Router();

router.get('/', getAudioEditorState);
router.post('/', saveAudioEditorState);

export default router;
