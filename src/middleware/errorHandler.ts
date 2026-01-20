import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

// ============================================
// 自定义错误类
// ============================================

/**
 * 业务错误（统一的错误类）
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

// ============================================
// 错误响应格式
// ============================================

interface ErrorResponse {
  code: number
  message: string
  data: null
  stack?: string  // 开发环境显示堆栈
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

    // 2. 业务错误
    if (error instanceof BusinessError) {
      reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        data: null
      })
      return
    }

    // 3. 未知错误
    request.log.error({ err: error }, '未捕获的错误')

    const response: ErrorResponse = {
      code: 500,
      message: isDevelopment ? error.message : '服务器错误',
      data: null
    }

    // 开发环境显示堆栈信息
    if (isDevelopment && error.stack) {
      response.stack = error.stack
    }

    reply.status(500).send(response)
  }
}

// ============================================
// 注册全局错误处理器
// ============================================

/**
 * 为 Fastify 实例注册全局错误处理
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  const isDevelopment = process.env.NODE_ENV !== 'production'

  fastify.setErrorHandler(errorHandler(isDevelopment))

  // 设置默认 404 处理器
  fastify.setNotFoundHandler(
    (_request, reply) => {
      reply.status(404).send({
        code: 404,
        message: '请求的接口不存在',
        data: null
      })
    }
  )
}
