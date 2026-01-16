import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

/**
 * 获取环境变量，如果不存在则打印警告/错误
 */
const getEnv = (name: string, isRequired = false): string => {
  const value = process.env[name]
  if (!value) {
    if (isRequired) {
      console.error(`错误: 关键环境变量 [${name}] 缺失！`)
    } else {
      // 非关键变量缺失时不报错，直接返回空字符串
    }
    return ''
  }
  return value
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  database: {
    url: getEnv('DATABASE_URL', true),
  },
  
  redis: {
    url: getEnv('REDIS_URL'),
  },
  
  jwt: {
    secret: getEnv('JWT_SECRET', true),
    expiresIn: '7d',
  },
  
  openai: {
    apiKey: getEnv('OPENAI_API_KEY', true),
    baseUrl: getEnv('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
  }
} as const

export type Config = typeof config
