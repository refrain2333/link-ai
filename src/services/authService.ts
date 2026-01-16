import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { prisma } from '@/db'
import bcrypt from 'bcrypt'

export async function login(email: string, password: string) {
    // 1. 根据 email 查用户
    const user = await prisma.user.findUnique({
      where: { email }
    })
    // 2. 用户不存在？
    if (!user) {
      const err = new Error('用户不存在') as any
      err.statusCode = 401
      throw err
    }
    // 3. 验证密码
    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      const err = new Error('密码错误') as any
      err.statusCode = 401
      throw err
    }
    // 4. 生成 token
    const token = jwt.sign(
      { userId: user.id, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )
    // 5. 返回（不含密码）
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name }
    }
  }