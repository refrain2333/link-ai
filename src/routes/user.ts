import { Controller, GET, PUT, POST } from 'fastify-decorators'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { getUserById, updateProfile, getUserStats, changePassword, verifyPassword, type UserProfile } from '@/services/userService'
import { authenticate } from '@/middleware/auth'
import { ZodError } from 'zod'
import { BusinessError } from '@/middleware/errorHandler'

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

  // 业务错误
  if (err instanceof BusinessError) {
    request.log.warn({ message: err.message }, '业务错误')
    reply.code(err.statusCode).send({
      code: err.statusCode,
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
 * 用户控制器
 */
@Controller('/api/user')
export class UserController {
  /**
   * 获取用户资料
   */
  @GET('/profile', {
    onRequest: [authenticate]
  })
  async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const user = await getUserById(userId)
      if (!user) {
        reply.status(404).send({
          code: 404,
          message: '用户不存在',
          data: null
        })
        return
      }

      reply.send({
        code: 0,
        message: 'success',
        data: user
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 更新用户资料
   */
  @PUT('/profile', {
    onRequest: [authenticate]
  })
  async updateProfile(request: FastifyRequest<{ Body: { name?: string; avatar?: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const user = await updateProfile(userId, request.body ?? {})
      reply.send({
        code: 0,
        message: 'success',
        data: user
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 获取使用统计
   */
  @GET('/stats', {
    onRequest: [authenticate]
  })
  async getStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const stats = await getUserStats(userId)
      reply.send({
        code: 0,
        message: 'success',
        data: stats
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 修改密码
   */
  @POST('/password', {
    onRequest: [authenticate]
  })
  async changePassword(request: FastifyRequest<{ Body: { oldPassword: string; newPassword: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const { oldPassword, newPassword } = request.body ?? {}

      if (!oldPassword || !newPassword) {
        reply.status(400).send({
          code: 400,
          message: '旧密码和新密码不能为空',
          data: null
        })
        return
      }

      // 验证旧密码
      const isValid = await verifyPassword(userId, oldPassword)
      if (!isValid) {
        reply.status(400).send({
          code: 400,
          message: '原密码错误',
          data: null
        })
        return
      }

      // 更新密码
      await changePassword(userId, newPassword)

      reply.send({
        code: 0,
        message: '密码修改成功',
        data: null
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }
}
