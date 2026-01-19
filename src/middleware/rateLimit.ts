import type { FastifyRequest, FastifyReply } from 'fastify'

// ============================================
// 内存存储（生产环境建议使用 Redis）
// ============================================

interface RateLimitItem {
  count: number
  resetTime: number
}

// 简单内存存储，使用 Map 存储用户/IP 的请求计数
const rateLimitStore = new Map<string, RateLimitItem>()

/**
 * 清理过期的记录（每小时执行一次）
 */
function cleanupExpiredRecords(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// 启动定时清理
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 60 * 60 * 1000)
}

// ============================================
// 配置
// ============================================

interface RateLimitOptions {
  // 限制时间窗口（毫秒）
  timeWindow: number
  // 允许的最大请求数
  maxRequests: number
  // 速率限制键的前缀
  keyPrefix: string
  // 响应消息
  message: string
}

/**
 * 默认配置
 */
const defaultOptions: RateLimitOptions = {
  timeWindow: 60 * 1000, // 1 分钟
  maxRequests: 60, // 每分钟最多 60 次请求
  keyPrefix: 'rate_limit',
  message: '请求过于频繁，请稍后再试'
}

// ============================================
// 限流中间件工厂
// ============================================

/**
 * 创建速率限制中间件
 *
 * @param options 配置选项
 * @returns Fastify 钩子函数
 */
export function createRateLimit(options: Partial<RateLimitOptions> = {}) {
  const config = { ...defaultOptions, ...options }

  return async function rateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // 生成限制键：支持按用户 ID 或 IP
      const userId = (request as any).user?.userId
      const key = userId
        ? `${config.keyPrefix}:user:${userId}`
        : `${config.keyPrefix}:ip:${getClientIp(request)}`

      const now = Date.now()
      const resetTime = now + config.timeWindow

      // 获取或创建记录
      let record = rateLimitStore.get(key)

      if (!record || record.resetTime < now) {
        // 新窗口或已过期
        record = { count: 0, resetTime }
        rateLimitStore.set(key, record)
      }

      // 增加请求计数
      record.count++

      // 设置响应头
      reply.header('X-RateLimit-Limit', config.maxRequests.toString())
      reply.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - record.count).toString())
      reply.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString())

      // 检查是否超出限制
      if (record.count > config.maxRequests) {
        reply.status(429).send({
          code: 429,
          message: config.message,
          data: null
        })
        return
      }

    } catch (err) {
      // 限流出错时放行，不阻塞请求
      request.log.warn({ err }, '速率限制中间件出错')
    }
  }
}

/**
 * 获取客户端 IP 地址
 */
function getClientIp(request: FastifyRequest): string {
  // 优先使用 X-Forwarded-For（反向代理场景）
  const forwarded = request.headers['x-forwarded-for']
  if (forwarded) {
    const forwardedValue = typeof forwarded === 'string' ? forwarded : forwarded[0]
    const ips = forwardedValue.split(',')
    return ips[0].trim()
  }

  // 其次使用 X-Real-IP
  const realIp = request.headers['x-real-ip']
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0]
  }

  // 最后使用 request.ip
  return request.ip ?? 'unknown'
}

// ============================================
// 预定义的限流规则
// ============================================

/**
 * 通用 API 限流（每分钟 60 次）
 */
export const rateLimit = createRateLimit({
  timeWindow: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'api',
  message: '请求过于频繁，请稍后再试'
})

/**
 * 严格限流（每分钟 20 次）
 * 适用于敏感操作如登录、注册
 */
export const strictRateLimit = createRateLimit({
  timeWindow: 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'strict',
  message: '请求过于频繁，请稍后再试'
})

/**
 * 宽松限流（每分钟 120 次）
 * 适用于获取数据的 GET 请求
 */
export const relaxedRateLimit = createRateLimit({
  timeWindow: 60 * 1000,
  maxRequests: 120,
  keyPrefix: 'relaxed',
  message: '请求过于频繁，请稍后再试'
})
