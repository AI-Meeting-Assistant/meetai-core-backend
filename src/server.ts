import 'dotenv/config';
import http from 'http';
import app from './app';

const PORT = process.env.PORT ?? 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`[server] API Docs available at http://localhost:${PORT}/api/docs`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
