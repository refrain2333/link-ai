import Fastify from 'fastify'
import { config } from '@/config'
import { registerAuthRoutes } from './routes/auth'

const PORT = config.port
const HOST = config.host

// 创建 Fastify 实例
const fastify = Fastify({
  logger: true
})

// 健康检查路由
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', message: '服务运行中' }
})

// 注册认证路由
await registerAuthRoutes(fastify)

// 启动服务
async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`✅ 服务启动成功：http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

