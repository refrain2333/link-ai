import jwt from 'jsonwebtoken'
import { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    reply.code(401).send({ message: '请先登录' })
    return
  }
  
  try {
    // 这里验证 token
    const decoded = jwt.verify(token, '你的密钥')
    // 把用户信息存到请求对象上
    (request as any).user = decoded
  } catch (err) {
    // token 无效
    reply.code(401).send({ message: '登录已过期' })
  }
}