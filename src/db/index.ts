import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { config } from '@/config'
import { logger } from '@/utils/logger'

// 创建 PostgreSQL 连接池
const pool = new pg.Pool({ connectionString: config.database.url })

// 创建 Prisma 适配器
const adapter = new PrismaPg(pool)

// 创建 Prisma 客户端实例
const prismaClient = new PrismaClient({
  adapter,
  // 将日志以事件形式发出，而不是直接打印
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
})

// 对接统一的 logger 打印日志
prismaClient.$on('query', (e: Prisma.QueryEvent) => {
  // 仅在开发环境打印详细的查询日志
  if (config.env === 'development') {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query')
  }
})

prismaClient.$on('error', (e: Prisma.LogEvent) => logger.error(e.message))
prismaClient.$on('info', (e: Prisma.LogEvent) => logger.info(e.message))
prismaClient.$on('warn', (e: Prisma.LogEvent) => logger.warn(e.message))

export const prisma = prismaClient
