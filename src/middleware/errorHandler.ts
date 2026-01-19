import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

// ============================================
// 自定义错误类
// ============================================

/**
 * 业务错误
 */
export class BusinessError extends Error {
  statusCode: number
  code: number
  constructor(message: string, statusCode = 400, code = 400) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'BusinessError'
  }
}

/**
 * 认证错误
 */
export class AuthError extends Error {
  statusCode = 401
  code = 401
  constructor(message: string = '认证失败') {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * 权限错误
 */
export class ForbiddenError extends Error {
  statusCode = 403
  code = 403
  constructor(message: string = '没有权限') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * 资源不存在错误
 */
export class NotFoundError extends Error {
  statusCode = 404
  code = 404
  constructor(message: string = '资源不存在') {
    super(message)
    this.name = 'NotFoundError'
  }
}

// ============================================
// 错误响应格式化
// ============================================

interface ErrorResponse {
  code: number
  message: string
  data: null
  // 开发环境额外信息
  stack?: string
}

/**
 * 格式化错误响应
 */
function formatErrorResponse(err: Error, isDevelopment: boolean): ErrorResponse {
  const response: ErrorResponse = {
    code: (err as any).code ?? 500,
    message: err.message || '服务器错误',
    data: null
  }

  // 开发环境显示堆栈信息
  if (isDevelopment && err.stack) {
    response.stack = err.stack
  }

  return response
}

// ============================================
// 错误处理中间件
// ============================================

/**
 * 全局错误处理中间件
 */
export function errorHandler(isDevelopment = process.env.NODE_ENV !== 'production') {
  return function handleError(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply
  ): void {
    // 1. Zod 参数校验错误
    if (error instanceof ZodError) {
      const messages = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')

      reply.status(400).send({
        code: 400,
        message: `参数校验失败: ${messages}`,
        data: null
      })
      return
    }

    // 2. 自定义业务错误
    if (error instanceof BusinessError) {
      reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        data: null
      })
      return
    }

    // 3. 认证错误
    if (error instanceof AuthError) {
      reply.status(401).send({
        code: 401,
        message: error.message,
        data: null
      })
      return
    }

    // 4. 权限错误
    if (error instanceof ForbiddenError) {
      reply.status(403).send({
        code: 403,
        message: error.message,
        data: null
      })
      return
    }

    // 5. 资源不存在错误
    if (error instanceof NotFoundError) {
      reply.status(404).send({
        code: 404,
        message: error.message,
        data: null
      })
      return
    }

    // 6. Fastify 已知错误类型
    if ('statusCode' in error) {
      const statusCode = (error as any).statusCode ?? 500
      reply.status(statusCode).send(formatErrorResponse(error, isDevelopment))
      return
    }

    // 7. 未知错误
    request.log.error({ err: error }, '未捕获的错误')
    reply.status(500).send(formatErrorResponse(error, isDevelopment))
  }
}

// ============================================
// 注册全局错误处理器
// ============================================

/**
 * 为 Fastify 实例注册全局错误处理
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  const isDevelopment = fastify.env.NODE_ENV !== 'production'

  fastify.setErrorHandler(errorHandler(isDevelopment))

  // 设置默认 404 处理器
  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit?.() ?? ((_req, _rep, done) => done())
    },
    (_request, reply) => {
      reply.status(404).send({
        code: 404,
        message: '请求的接口不存在',
        data: null
      })
    }
  )
}
