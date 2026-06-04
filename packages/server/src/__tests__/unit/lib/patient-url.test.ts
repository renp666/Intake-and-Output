/**
 * Unit tests for src/lib/patient-url.ts
 * 覆盖多环境场景：开发/测试/生产、反代/直连、标准端口/自定义端口
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolvePatientBaseUrl, buildPatientVerifyUrl } from '../../../lib/patient-url';
import type { Request } from 'express';

// 创建 mock Request 对象
function mockRequest(overrides: Record<string, string> = {}): Request {
  const headers: Record<string, string> = {
    host: 'localhost:5174',
    ...overrides,
  };
  return {
    get: (name: string) => headers[name.toLowerCase()] || headers[name] || undefined,
    hostname: headers.host?.split(':')[0] || 'localhost',
    protocol: 'http',
  } as unknown as Request;
}

describe('patient-url', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 清理相关环境变量
    delete process.env.PATIENT_APP_URL;
    delete process.env.PATIENT_APP_PORT;
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = { ...originalEnv };
  });

  describe('resolvePatientBaseUrl', () => {
    // === 场景1: PATIENT_APP_URL 环境变量（最高优先级） ===
    describe('PATIENT_APP_URL 环境变量', () => {
      it('开发环境: 使用环境变量完整地址', () => {
        process.env.PATIENT_APP_URL = 'http://192.168.1.100:3001';
        const result = resolvePatientBaseUrl();
        expect(result).toBe('http://192.168.1.100:3001');
      });

      it('生产环境: 使用域名地址', () => {
        process.env.PATIENT_APP_URL = 'https://app.hospital.com';
        const result = resolvePatientBaseUrl();
        expect(result).toBe('https://app.hospital.com');
      });

      it('去除尾部斜杠', () => {
        process.env.PATIENT_APP_URL = 'http://192.168.1.100:3001/';
        const result = resolvePatientBaseUrl();
        expect(result).toBe('http://192.168.1.100:3001');
      });

      it('去除多个尾部斜杠', () => {
        process.env.PATIENT_APP_URL = 'https://app.hospital.com///';
        const result = resolvePatientBaseUrl();
        expect(result).toBe('https://app.hospital.com');
      });

      it('环境变量优先于请求头', () => {
        process.env.PATIENT_APP_URL = 'http://env-address:3001';
        const req = mockRequest({ host: '10.0.0.1:5174' });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://env-address:3001');
      });
    });

    // === 场景2: 请求头推导（Nginx 反代 / 负载均衡） ===
    describe('X-Forwarded-Host 反代场景', () => {
      it('Nginx 反代: 使用 X-Forwarded-Host', () => {
        const req = mockRequest({
          'X-Forwarded-Host': 'app.hospital.com',
          'X-Forwarded-Proto': 'https',
          host: 'localhost:3000',
        });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('https://app.hospital.com:3001');
      });

      it('Nginx 反代: X-Forwarded-Host 含端口，替换为患者端端口', () => {
        const req = mockRequest({
          'X-Forwarded-Host': 'app.hospital.com:8080',
          'X-Forwarded-Proto': 'https',
        });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('https://app.hospital.com:3001');
      });

      it('Nginx 反代: 无 X-Forwarded-Proto 时默认 http', () => {
        const req = mockRequest({
          'X-Forwarded-Host': '10.0.0.1',
        });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://10.0.0.1:3001');
      });
    });

    // === 场景3: 直连场景（无反代） ===
    describe('直连场景', () => {
      it('开发环境: 护士端请求，提取 IP 拼接患者端端口', () => {
        const req = mockRequest({ host: '192.168.1.100:5174' });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://192.168.1.100:3001');
      });

      it('开发环境: localhost 请求', () => {
        const req = mockRequest({ host: 'localhost:5174' });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://localhost:3001');
      });

      it('自定义患者端端口', () => {
        process.env.PATIENT_APP_PORT = '8080';
        const req = mockRequest({ host: '192.168.1.100:5174' });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://192.168.1.100:8080');
      });
    });

    // === 场景4: 标准端口（80/443） ===
    describe('标准端口场景', () => {
      it('端口80时不拼接端口号', () => {
        process.env.PATIENT_APP_PORT = '80';
        const req = mockRequest({ host: '10.0.0.1:3000' });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://10.0.0.1');
      });

      it('端口443时不拼接端口号', () => {
        process.env.PATIENT_APP_PORT = '443';
        const req = mockRequest({ host: '10.0.0.1:3000', 'X-Forwarded-Proto': 'https' });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('https://10.0.0.1');
      });
    });

    // === 场景5: 兜底场景 ===
    describe('兜底场景', () => {
      it('无请求且无环境变量时返回 localhost', () => {
        const result = resolvePatientBaseUrl();
        expect(result).toBe('http://localhost:3001');
      });

      it('无请求时使用自定义端口', () => {
        process.env.PATIENT_APP_PORT = '8080';
        const result = resolvePatientBaseUrl();
        expect(result).toBe('http://localhost:8080');
      });
    });

    // === 场景6: 容器化部署 ===
    describe('容器化部署场景', () => {
      it('Docker: X-Forwarded-Host 为内网 IP', () => {
        const req = mockRequest({
          'X-Forwarded-Host': '172.17.0.1',
          'X-Forwarded-Proto': 'http',
        });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://172.17.0.1:3001');
      });

      it('K8s: X-Forwarded-Host 为域名', () => {
        const req = mockRequest({
          'X-Forwarded-Host': 'patient.default.svc.cluster.local',
          'X-Forwarded-Proto': 'http',
        });
        const result = resolvePatientBaseUrl(req);
        expect(result).toBe('http://patient.default.svc.cluster.local:3001');
      });
    });
  });

  describe('buildPatientVerifyUrl', () => {
    it('正常床位号', () => {
      process.env.PATIENT_APP_URL = 'http://192.168.1.100:3001';
      const result = buildPatientVerifyUrl('A001');
      expect(result).toBe('http://192.168.1.100:3001/verify?bed=A001');
    });

    it('含空格的床位号应被编码', () => {
      process.env.PATIENT_APP_URL = 'http://192.168.1.100:3001';
      const result = buildPatientVerifyUrl('ICU 01');
      expect(result).toBe('http://192.168.1.100:3001/verify?bed=ICU%2001');
    });

    it('含中文的床位号应被编码', () => {
      process.env.PATIENT_APP_URL = 'http://192.168.1.100:3001';
      const result = buildPatientVerifyUrl('重症01床');
      expect(result).toContain('/verify?bed=');
      expect(result).not.toContain('重症');
    });

    it('从请求推导地址时正确拼接', () => {
      const req = mockRequest({ host: '10.0.0.1:5174' });
      const result = buildPatientVerifyUrl('B002', req);
      expect(result).toBe('http://10.0.0.1:3001/verify?bed=B002');
    });
  });
});
