/**
 * CORS 配置
 */
export const corsOptions = {
  // 允许的来源，生产环境建议指定具体域名
  origin: process.env.CORS_ORIGIN ?? true, // true 允许所有来源（开发环境）

  // 允许的 HTTP 方法
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // 允许的请求头
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],

  // 暴露给前端的头部
  exposedHeaders: ['Content-Length', 'X-Request-Id'],

  // 凭证支持
  credentials: true,

  // 预检请求缓存时间（秒）
  maxAge: 86400 // 24 小时
}
