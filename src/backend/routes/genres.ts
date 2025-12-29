import { Router } from 'express';
import { listGenres, addGenre, deleteGenre } from '../controllers/genres';

const genresRouter = Router();

genresRouter.get('/', listGenres);
genresRouter.post('/', addGenre);
genresRouter.delete('/:name', deleteGenre);

export default genresRouter;
