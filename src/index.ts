import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from '@/config'
import { bootstrap } from 'fastify-decorators'
import { AuthController } from './routes/auth'
import { ChatController } from './routes/chat'
import { UserController } from './routes/user'
import { corsOptions, rateLimit, registerErrorHandler } from '@/middleware'

const PORT = config.port
const HOST = config.host

// 创建 Fastify 实例
const fastify = Fastify({
  logger: true
})

// ============================================
// 注册中间件
// ============================================

// 1. CORS 跨域支持
await fastify.register(cors, corsOptions)

// 2. 全局错误处理
registerErrorHandler(fastify)

// 3. 全局限流（可选，可针对特定路由配置）
fastify.addHook('onRequest', rateLimit)

// ============================================
// 路由
// ============================================

// 健康检查
fastify.get('/health', async (_request, reply) => {
  reply.send({ status: 'ok', message: '服务运行中' })
})

// 注册装饰器控制器
await fastify.register(bootstrap, {
  controllers: [AuthController, ChatController, UserController]
})

// ============================================
// 启动服务
// ============================================

async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`服务启动成功：http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
