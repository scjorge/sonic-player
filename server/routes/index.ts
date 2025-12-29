import { Router } from 'express';
import downloadsRouter from './downloads';

const router = Router();

router.use('/downloads', downloadsRouter);

export default router;
