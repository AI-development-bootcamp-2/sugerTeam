import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
