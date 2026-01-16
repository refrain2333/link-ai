import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from '@/config'

// 确保 Prisma CLI 运行时使用我们统一配置的数据库地址
process.env.DATABASE_URL = config.database.url

export default defineConfig({
  // 直接指向同目录下的 schema 文件
  schema: path.join(__dirname, 'schema.prisma')
})
