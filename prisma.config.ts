import 'dotenv/config'
import path from 'node:path'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // 1. 指定 schema 文件路径
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  
  // 2. 配置数据库连接
  datasource: {
    url: env('DATABASE_URL'),
  },
})
