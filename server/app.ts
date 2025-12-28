import express from 'express';
import routes from './routes/index';
import cors from 'cors';


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
