/**
 * Unit tests for src/routes/voice.ts
 * Tests voice recognition endpoint and text parsing logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';

// Mock the index module
vi.mock('../../../index', () => ({
  asyncHandler: (fn: any) => fn,
  default: {},
}));

import voiceRouter from '../../../routes/voice';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/voice', voiceRouter);
  return app;
}

async function request(app: express.Application, method: string, path: string, options: {
  body?: any;
  headers?: Record<string, string>;
} = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      const url = `http://127.0.0.1:${port}${path}`;

      const fetchOptions: any = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      if (options.body && method.toUpperCase() !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      fetch(url, fetchOptions)
        .then(async (res) => {
          const body = await res.json();
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe('Voice Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/voice/recognize', () => {
    it('should return placeholder when no input provided', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: {},
      });

      expect(res.status).toBe(200);
      expect(res.body.data.method).toBe('placeholder');
      expect(res.body.data.message).toContain('not yet implemented');
    });

    it('should parse intake text - 饮水', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '喝水200ml' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.rawText).toBe('喝水200ml');
      expect(res.body.data.parsed.recordType).toBe('intake');
      expect(res.body.data.parsed.itemName).toBe('饮水');
      expect(res.body.data.parsed.amount).toBe(200);
      expect(res.body.data.parsed.unit).toBe('ml');
      expect(res.body.data.method).toBe('text');
    });

    it('should parse intake text - 汤', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '喝了碗汤150' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('intake');
      expect(res.body.data.parsed.itemName).toBe('汤');
      expect(res.body.data.parsed.amount).toBe(150);
    });

    it('should parse intake text - 牛奶', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '牛奶250ml' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('intake');
      expect(res.body.data.parsed.itemName).toBe('牛奶');
      expect(res.body.data.parsed.amount).toBe(250);
    });

    it('should parse output text - 尿量', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '小便300ml' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('output');
      expect(res.body.data.parsed.itemName).toBe('尿量');
      expect(res.body.data.parsed.amount).toBe(300);
    });

    it('should parse output text - 大便', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '大便1次' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('output');
      expect(res.body.data.parsed.itemName).toBe('大便');
      expect(res.body.data.parsed.amount).toBe(1);
      expect(res.body.data.parsed.unit).toBe('次');
    });

    it('should parse output text - 呕吐', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '呕吐50ml' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('output');
      expect(res.body.data.parsed.itemName).toBe('呕吐物');
      expect(res.body.data.parsed.amount).toBe(50);
    });

    it('should convert 升 to ml', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '喝水1升' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.amount).toBe(1000);
      expect(res.body.data.parsed.unit).toBe('L');
    });

    it('should handle unrecognized text', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '今天天气不错' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBeNull();
      expect(res.body.data.parsed.amount).toBe(0);
    });

    it('should handle text with no number', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '喝水' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('intake');
      expect(res.body.data.parsed.itemName).toBe('饮水');
      expect(res.body.data.parsed.amount).toBe(0);
    });

    it('should handle decimal numbers', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '喝水1.5升' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.amount).toBe(1500);
    });

    it('should return 400 for invalid request body', async () => {
      // audio must be string if provided, but sending number should fail zod
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { audio: 12345 },
      });

      expect(res.status).toBe(400);
    });

    it('should handle 输液 intake keyword', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '输液500ml' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('intake');
      expect(res.body.data.parsed.itemName).toBe('输液');
      expect(res.body.data.parsed.amount).toBe(500);
    });

    it('should handle 引流 output keyword', async () => {
      const res = await request(app, 'POST', '/api/voice/recognize', {
        body: { text: '引流100ml' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.recordType).toBe('output');
      expect(res.body.data.parsed.itemName).toBe('引流');
      expect(res.body.data.parsed.amount).toBe(100);
    });
  });
});
