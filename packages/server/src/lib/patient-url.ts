/**
 * 患者端访问地址解析工具
 *
 * 解析优先级：
 * 1. PATIENT_APP_URL 环境变量（完整地址，最高优先级）
 * 2. 请求头推导（支持 Nginx 反代 / 负载均衡）
 *    - X-Forwarded-Host + X-Forwarded-Proto
 *    - Host 请求头
 * 3. 兜底: localhost:3001
 *
 * 环境变量：
 * - PATIENT_APP_URL: 完整患者端地址，如 http://192.168.1.100:3001 或 https://app.example.com
 * - PATIENT_APP_PORT: 患者端端口，默认 3001（仅在未设置 PATIENT_APP_URL 时生效）
 */

import type { Request } from 'express';

// 默认患者端端口
const DEFAULT_PATIENT_PORT = '3001';

/**
 * 从请求中解析患者端基础 URL
 *
 * @param req Express Request 对象（可选，服务端渲染等无 req 场景传 undefined）
 * @returns 患者端基础 URL（不含尾部斜杠），如 http://192.168.1.100:3001
 */
export function resolvePatientBaseUrl(req?: Request): string {
  // 优先级 1: 环境变量完整地址
  const envUrl = process.env.PATIENT_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  const patientPort = process.env.PATIENT_APP_PORT || DEFAULT_PATIENT_PORT;

  // 优先级 2: 从请求头推导
  if (req) {
    // 信任 proxy 时优先使用 X-Forwarded-* 头
    const forwardedHost = req.get('X-Forwarded-Host');
    const forwardedProto = req.get('X-Forwarded-Proto');

    if (forwardedHost) {
      const protocol = forwardedProto || 'http';
      // X-Forwarded-Host 可能包含端口（如 app.example.com:443），也可能不含
      // 需要替换端口为患者端端口
      const hostWithoutPort = forwardedHost.split(':')[0];
      // 如果是标准端口(80/443)，不拼接端口号
      if (patientPort === '80' || patientPort === '443') {
        return `${protocol}://${hostWithoutPort}`;
      }
      return `${protocol}://${hostWithoutPort}:${patientPort}`;
    }

    // 使用 Express 的 hostname（已通过 app.set('trust proxy') 信任反代）
    const hostname = req.hostname || req.get('host')?.split(':')[0] || 'localhost';
    const protocol = forwardedProto || req.protocol || 'http';

    if (patientPort === '80' || patientPort === '443') {
      return `${protocol}://${hostname}`;
    }
    return `${protocol}://${hostname}:${patientPort}`;
  }

  // 优先级 3: 兜底
  return `http://localhost:${patientPort}`;
}

/**
 * 生成患者端验证页面完整 URL
 *
 * @param bedNumber 床位号
 * @param req Express Request 对象（可选）
 * @returns 完整 URL，如 http://192.168.1.100:3001/verify?bed=A001
 */
export function buildPatientVerifyUrl(bedNumber: string, req?: Request): string {
  const baseUrl = resolvePatientBaseUrl(req);
  return `${baseUrl}/verify?bed=${encodeURIComponent(bedNumber)}`;
}
