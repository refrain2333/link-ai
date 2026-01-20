import { prisma } from '@/db/index.js'
import bcrypt from 'bcrypt'
import { BusinessError } from '@/middleware/errorHandler.js'

// ============================================
// 类型定义
// ============================================

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  createdAt: Date
  lastLoginAt: Date | null
}

export interface UserStats {
  totalChats: number
  totalMessages: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
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
  // 并行查询用户信息、对话数和消息数
  const [user, totalChats, totalMessages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalPromptTokens: true,
        totalCompletionTokens: true,
        totalTokens: true
      }
    }),
    prisma.chat.count({
      where: { userId }
    }),
    prisma.message.count({
      where: {
        chat: { userId }
      }
    })
  ])

  if (!user) {
    throw new BusinessError('用户不存在', 404)
  }

  return {
    totalChats,
    totalMessages,
    promptTokens: user.totalPromptTokens,
    completionTokens: user.totalCompletionTokens,
    totalTokens: user.totalTokens
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

/**
 * 验证旧密码是否正确
 */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  })

  if (!user) {
    return false
  }

  return await bcrypt.compare(password, user.password)
}
