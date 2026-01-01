import { Router } from 'express';
import { recogniseWithShazam } from '../controllers/shazam';

const router = Router();

router.post('/recognise', recogniseWithShazam);

export default router;
