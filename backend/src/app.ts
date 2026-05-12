import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import clientsRouter from './routes/clients';
import projectsRouter from './routes/projects';
import absencesRouter from './routes/absences';
import tasksRouter from './routes/tasks';

const app = express();

const corsOptions = { origin: process.env.CLIENT_URL, credentials: true };
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/clients', clientsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/absences', absencesRouter);
app.use('/api/v1/tasks', tasksRouter);

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Four-argument signature is required for Express to treat this as an error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
