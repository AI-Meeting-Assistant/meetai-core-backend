import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Health route', () => {
  it('GET /api/v1/health returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});
