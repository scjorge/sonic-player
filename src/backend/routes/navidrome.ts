import { Router } from 'express';
import { getNavidromeSettings, saveNavidromeSettings, clearNavidromeSettings, search4 } from '../controllers/navidrome';
import { authMiddleware } from '../middleware/auth';

const navidromeRouter = Router();

navidromeRouter.get('/', authMiddleware, getNavidromeSettings);
navidromeRouter.put('/', authMiddleware, saveNavidromeSettings);
navidromeRouter.delete('/', authMiddleware, clearNavidromeSettings);
navidromeRouter.get('/search4', search4);


export default navidromeRouter;
