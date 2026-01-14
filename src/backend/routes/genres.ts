import { Router } from 'express';
import { listGenres, addGenre, deleteGenre } from '../controllers/genres';
import { authMiddleware } from '../middleware/auth';

const genresRouter = Router();

genresRouter.get('/', authMiddleware, listGenres);
genresRouter.post('/', authMiddleware, addGenre);
genresRouter.delete('/:name', authMiddleware, deleteGenre);

export default genresRouter;
