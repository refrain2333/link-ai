import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { prisma } from '@/db'
import bcrypt from 'bcrypt'
import { logger } from '@/utils/logger'
import { z } from 'zod'

// 定义 JWT Payload 类型
export interface JWTPayload {
  userId: string
  name: string | null
  email: string
}

// 定义认证错误类型
export class AuthError extends Error {
  statusCode = 401
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// ==================== 公共 Schema 定义 ====================

// 邮箱验证
const emailSchema = z.email({ message: '邮箱格式不正确' })
  .max(255, { message: '邮箱长度不能超过255个字符' })

// 密码验证
const passwordSchema = z.string({ message: '密码不能为空' })
  .min(6, { message: '密码不能少于6个字符' })
  .max(128, { message: '密码长度不能超过128个字符' })

// ==================== 注册 ====================

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().refine(val => val.length > 0, { message: '昵称不能为空' }).max(255, { message: '昵称长度不能超过255个字符' })
})
export type RegisterParams = z.infer<typeof registerSchema>

export async function register(params: RegisterParams, ip?: string) {
  // 1. 参数验证
  const { email, password, name } = registerSchema.parse(params)

  // 2. 统一转小写
  const normalizedEmail = email.toLowerCase().trim()
  const trimmedName = name.trim()

  // 3. 检查邮箱是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })
  if (existingUser) {
    logger.warn({ email: normalizedEmail }, '注册失败：邮箱已存在')
    throw new AuthError('该邮箱已注册')
  }

  // 4. 密码哈希
  const passwordHash = await bcrypt.hash(password, 10)

  // 5. 创建用户
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      name: trimmedName,
      lastLoginAt: new Date(),
      lastLoginIp: ip ?? null
    }
  })

  // 6. 生成 token
  const payload: JWTPayload = {
    userId: user.id,
    name: user.name,
    email: user.email
  }
  const token = jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )

  // 7. 记录注册成功日志
  logger.info({
    userId: user.id,
    email: normalizedEmail,
    ip
  }, '注册成功')

  // 8. 返回结果
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
}

// ==================== 登录 ====================

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})
export type LoginParams = z.infer<typeof loginSchema>

export async function login(params: LoginParams, ip?: string) {
  // 1. 参数验证（使用 Zod）
  const { email, password } = loginSchema.parse(params)

  // 2. 统一转小写并去除首尾空格（符合 RFC 5321 标准）
  const normalizedEmail = email.toLowerCase().trim()

  // 3. 根据 email 查用户
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  // 4. 用户不存在？
  if (!user) {
    logger.warn({ email: normalizedEmail }, '登录失败：用户不存在')
    throw new AuthError('该邮箱未注册')
  }

  // 5. 验证密码
  const passwordValid = await bcrypt.compare(password, user.password)
  if (!passwordValid) {
    logger.warn({ email: normalizedEmail, userId: user.id }, '登录失败：密码错误')
    throw new AuthError('密码错误')
  }

  // 6. 生成 token
  const payload: JWTPayload = {
    userId: user.id,
    name: user.name,
    email: user.email
  }

  const token = jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )

  // 7. 更新最后登录信息（使用事务，防止竞态条件）
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? null
      }
    })
  ])

  // 8. 记录登录成功日志
  logger.info({
    userId: user.id,
    email: normalizedEmail,
    ip
  }, '登录成功')

  // 9. 返回结果
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
}
