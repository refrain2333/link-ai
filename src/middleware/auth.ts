import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '@/config'

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
interface JWTPayload {
  userId: string
  name: string | null
  email: string
}

// 辅助函数：获取非空密钥
function getJwtSecret(): string {
  const secret = config.jwt.secret
  if (!secret || secret.length === 0) {
    throw new Error('JWT_SECRET 环境变量未配置')
  }
  // 使用类型断言，jsonwebtoken 需要 string 类型
  return secret!
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
 *   const userId = request.user?.userId
 * })
 * ```
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // 1. 获取 Authorization Header
    const authHeader = request.headers.authorization

    if (!authHeader) {
      reply.status(401).send({
        code: 401,
        message: '未提供认证令牌',
        data: null
      })
      return
    }

    // 2. 验证 Header 格式
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      reply.status(401).send({
        code: 401,
        message: '认证令牌格式无效，请使用 Bearer 格式',
        data: null
      })
      return
    }

    const token = parts[1]

    // 3. 验证 JWT Token
    let payload: JWTPayload
    try {
      // @ts-expect-error jsonwebtoken 类型定义过于严格
      payload = jwt.verify(token, getJwtSecret()) as unknown as JWTPayload
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        reply.status(401).send({
          code: 401,
          message: '认证令牌已过期，请重新登录',
          data: null
        })
        return
      }

      if (err instanceof jwt.JsonWebTokenError) {
        reply.status(401).send({
          code: 401,
          message: '认证令牌无效',
          data: null
        })
        return
      }

      // 其他错误
      reply.status(401).send({
        code: 401,
        message: '认证失败',
        data: null
      })
      return
    }

    // 4. 将用户信息挂载到 request
    request.user = {
      userId: payload.userId,
      name: payload.name,
      email: payload.email
    }

  } catch (err) {
    // 未知错误
    request.log.error({ err }, '认证中间件发生错误')
    reply.status(500).send({
      code: 500,
      message: '认证服务暂时不可用',
      data: null
    })
  }
}

/**
 * 可选的认证中间件
 *
 * 如果提供了 token 则解析，但不强制要求登录
 * 适用于公开接口但需要记录用户信息的场景
 */
export async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return
    }

    const token = parts[1]

    try {
      // @ts-expect-error jsonwebtoken 类型定义过于严格
      const payload = jwt.verify(token, getJwtSecret()) as unknown as JWTPayload
      request.user = {
        userId: payload.userId,
        name: payload.name,
        email: payload.email
      }
    } catch {
      // token 无效时不报错，视为未登录
    }
  } catch (err) {
    // 静默忽略错误
  }
}

/**
 * 生成 JWT Token
 *
 * @param payload 用户信息
 * @returns JWT Token 字符串
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), {
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
    return jwt.verify(token, getJwtSecret()) as unknown as JWTPayload
  } catch {
    return null
  }
}
