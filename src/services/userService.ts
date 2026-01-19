import { Controller, GET, PUT, POST } from 'fastify-decorators'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@/db/index.js'
import bcrypt from 'bcrypt'
import { ZodError } from 'zod'
import { authenticate } from '@/middleware/auth.js'
import { BusinessError, NotFoundError } from '@/middleware/errorHandler.js'

// ============================================
// 类型定义
// ============================================

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  createdAt: Date
  lastLoginAt: Date | null
}

interface UserStats {
  totalChats: number
  totalMessages: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

interface UserCredits {
  credits: number
  usedCredits: number
}

// ============================================
// 辅助函数
// ============================================

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

  // 服务器错误
  request.log.error(err)
  reply.code(500).send({
    code: 500,
    message: '服务器错误'
  })
}

/**
 * 检查用户是否存在
 */
async function checkUserExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  })
  return !!user
}

// ============================================
// Service 函数
// ============================================

/**
 * 根据用户 ID 获取用户信息
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
      lastLoginAt: true
    }
  })

  return user
}

/**
 * 更新用户资料
 */
export async function updateProfile(userId: string, data: { name?: string; avatar?: string }): Promise<UserProfile> {
  // 使用 Prisma 的更新操作符来处理可选字段
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) {
    updateData.name = data.name
  }
  if (data.avatar !== undefined) {
    updateData.avatar = data.avatar
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
      lastLoginAt: true
    }
  })

  return user
}

/**
 * 获取用户使用统计
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const totalChats = await prisma.chat.count({
    where: { userId }
  })

  const messageStats = await prisma.message.aggregate({
    where: {
      chat: { userId }
    },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true
    }
  })

  const totalMessages = await prisma.message.count({
    where: {
      chat: { userId }
    }
  })

  return {
    totalChats,
    totalMessages,
    promptTokens: messageStats._sum.promptTokens ?? 0,
    completionTokens: messageStats._sum.completionTokens ?? 0,
    totalTokens: messageStats._sum.totalTokens ?? 0
  }
}

/**
 * 获取用户剩余额度
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, totalCredits: true }
  })

  if (!user) {
    throw new NotFoundError('用户不存在')
  }

  return {
    credits: user.credits,
    usedCredits: user.totalCredits - user.credits
  }
}

/**
 * 修改密码
 */
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword
    }
  })
}

/**
 * 扣除用户积分
 */
export async function deductCredits(userId: string, amount: number): Promise<void> {
  if (amount <= 0) {
    throw new BusinessError('扣除积分必须大于 0')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true }
  })

  if (!user) {
    throw new NotFoundError('用户不存在')
  }

  if (user.credits < amount) {
    throw new BusinessError('积分余额不足')
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        decrement: amount
      }
    }
  })
}

/**
 * 检查邮箱是否已被使用
 */
export async function isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      email,
      ...(excludeUserId && { id: { not: excludeUserId } })
    }
  })

  return !!user
}

// ============================================
// 控制器
// ============================================

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

      const exists = await checkUserExists(userId)
      if (!exists) {
        reply.status(404).send({
          code: 404,
          message: '用户不存在',
          data: null
        })
        return
      }

      const user = await getUserById(userId)
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
   * 获取剩余额度
   */
  @GET('/credits', {
    onRequest: [authenticate]
  })
  async getCredits(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const credits = await getUserCredits(userId)
      reply.send({
        code: 0,
        message: 'success',
        data: credits
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

      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        reply.status(404).send({
          code: 404,
          message: '用户不存在',
          data: null
        })
        return
      }

      // 验证旧密码
      const isValid = await bcrypt.compare(oldPassword, user.password)
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
