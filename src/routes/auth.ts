import { Controller, POST } from 'fastify-decorators'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { register, login, AuthError, type RegisterParams, type LoginParams } from '@/services/authService'
import { ZodError } from 'zod'

/**
 * 获取客户端 IP
 */
function getClientIp(request: FastifyRequest): string {
  return request.ip ?? request.headers['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ?? ''
}

/**
 * 统一错误响应
 */
function handleError(request: FastifyRequest, reply: FastifyReply, err: unknown): void {
  // Zod 校验错误
  if (err instanceof ZodError) {
    const messages = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    reply.code(400).send({
      code: 400,
      message: `参数校验失败: ${messages}`
    })
    return
  }

  // 业务错误（如邮箱已注册、密码错误）
  if (err instanceof AuthError) {
    request.log.warn({ message: err.message }, '业务错误')
    reply.code(400).send({
      code: 400,
      message: err.message
    })
    return
  }

  // 服务器错误
  request.log.error(err)
  reply.code(500).send({
    code: 500,
    message: '服务器错误'
  })
}

/**
 * 认证控制器
 */
@Controller('/api/auth')
export class AuthController {
  @POST('/register')
  async register(request: FastifyRequest<{ Body: RegisterParams }>, reply: FastifyReply): Promise<void> {
    const ip = getClientIp(request)
    try {
      const result = await register(request.body, ip)
      reply.code(201).send({
        code: 0,
        message: '注册成功',
        data: result
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  @POST('/login')
  async login(request: FastifyRequest<{ Body: LoginParams }>, reply: FastifyReply): Promise<void> {
    const ip = getClientIp(request)
    try {
      const result = await login(request.body, ip)
      reply.send({
        code: 0,
        message: '登录成功',
        data: result
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }
}
