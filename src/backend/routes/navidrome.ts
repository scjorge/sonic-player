import { Router } from 'express';
import { getNavidromeSettings, saveNavidromeSettings, clearNavidromeSettings, searchByComment } from '../controllers/navidrome';

const navidromeRouter = Router();

navidromeRouter.get('/', getNavidromeSettings);
navidromeRouter.put('/', saveNavidromeSettings);
navidromeRouter.delete('/', clearNavidromeSettings);
navidromeRouter.get('/searchByComment', searchByComment);


export default navidromeRouter;
