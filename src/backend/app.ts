import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { AppDataSource } from './utils/db';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);

const PORT = 3001;

AppDataSource.initialize()
  .then(() => {
    console.log('Database initialized');
    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });

