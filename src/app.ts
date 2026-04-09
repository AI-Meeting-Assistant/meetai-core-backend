import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';

import { apiRouter } from './api/routes/index';
import { globalErrorHandler } from './api/middlewares/globalErrorHandler';
import { notFound } from './api/middlewares/notFound';

const app: Application = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes (Facade) ───────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use(notFound);

// ── Global Error Handler (must be LAST) ───────────────────────────────────────
app.use(globalErrorHandler);

export default app;
