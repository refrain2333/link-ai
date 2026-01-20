import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { BusinessError } from '@/middleware/errorHandler'

// ============================================
// 类型定义
// ============================================

// 扩展 FastifyRequest 类型
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
      name: string | null
      email: string
    }
  }
}

// JWT Payload 类型
export interface JWTPayload {
  userId: string
  name: string | null
  email: string
}

// ============================================
// 认证中间件
// ============================================

/**
 * JWT 认证中间件
 *
 * 使用方式：在路由的 onRequest 中使用
 *
 * 示例：
 * ```typescript
 * fastify.get('/protected', {
 *   onRequest: [authenticate]
 * }, async (request, reply) => {
 *   // request.user 已包含解析后的用户信息
 *   const sub = request.user?.sub
 * })
 * ```
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // 1. 获取 Authorization Header
  const authHeader = request.headers.authorization
  if (!authHeader) {
    throw new BusinessError('未提供认证令牌', 401)
  }

  // 2. 验证 Header 格式
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new BusinessError('认证令牌格式无效，请使用 Bearer 格式', 401)
  }

  const token = parts[1]
  if (!token) {
    throw new BusinessError('认证令牌不能为空', 401)
  }

  // 3. 验证 JWT Token
  try {
    const secret = config.jwt.secret
    if (!secret) {
      throw new BusinessError('JWT 配置错误', 500)
    }

    const payload = jwt.verify(token, secret) as unknown as JWTPayload

    // 4. 将用户信息挂载到 request
    request.user = {
      userId: payload.userId,
      name: payload.name,
      email: payload.email
    }
  } catch (err) {
    if (err instanceof BusinessError) {
      throw err
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new BusinessError('认证令牌已过期，请重新登录', 401)
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new BusinessError('认证令牌无效', 401)
    }
    throw new BusinessError('认证失败', 401)
  }
}

/**
 * 可选的认证中间件
 *
 * 如果提供了 token 则解析，但不强制要求登录
 * 适用于公开接口但需要记录用户信息的场景
 */
export async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader) return

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return

  const token = parts[1]
  if (!token) return

  try {
    const secret = config.jwt.secret
    if (!secret) {
      return
    }

    const payload = jwt.verify(token, secret) as unknown as JWTPayload
    request.user = {
      userId: payload.userId,
      name: payload.name,
      email: payload.email
    }
  } catch {
    // token 无效时不报错，视为未登录
  }
}

/**
 * 生成 JWT Token
 *
 * @param payload 用户信息
 * @returns JWT Token 字符串
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const secret = config.jwt.secret
  if (!secret) {
    throw new Error('JWT_SECRET 未配置')
  }

  return jwt.sign(payload, secret, {
    expiresIn: config.jwt.expiresIn
  })
}

/**
 * 验证 Token 并返回 Payload
 *
 * @param token JWT Token 字符串
 * @returns 解码后的 Payload，如果无效返回 null
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = config.jwt.secret
    if (!secret) {
      return null
    }

    return jwt.verify(token, secret) as unknown as JWTPayload
  } catch {
    return null
  }
}
