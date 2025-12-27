import { Router } from 'express';
import tidalRoutes from './tidal';

const router = Router();

router.use('/tidal', tidalRoutes);

export default router;
