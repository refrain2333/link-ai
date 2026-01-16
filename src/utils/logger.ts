import pino from 'pino'
import { config } from '@/config'
import path from 'node:path'

const LOG_DIR = path.join(process.cwd(), '..', '..', 'logs')

// 1. 常规运行日志的 Transport (包含终端和文件)
const mainTransport = pino.transport({
  targets: [
    ...(config.env === 'development'
      ? [{
          target: 'pino-pretty',
          level: 'debug',
          options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
        }]
      : []),
    {
      target: 'pino-roll',
      level: 'info',
      options: {
        file: path.join(LOG_DIR, 'runtime', 'app'),
        frequency: 'daily',
        extension: '.log',
        mkdir: true,
        limit: { count: 30 }
      }
    }
  ]
})

// 2. 对话追踪日志的 Transport (仅输出到 trace 文件)
const traceTransport = pino.transport({
  targets: [
    {
      target: 'pino-roll',
      level: 'info',
      options: {
        file: path.join(LOG_DIR, 'trace', 'chat'),
        frequency: 'daily',
        extension: '.jsonl',
        mkdir: true,
        limit: { count: 90 }
      }
    }
  ]
})

// 导出主 Logger
export const logger = pino({ level: config.env === 'development' ? 'debug' : 'info' }, mainTransport)

// 专用对话追踪 Logger
const traceLogger = pino({ level: 'info' }, traceTransport)

/**
 * 快捷工具：专门用于记录对话 Trace
 */
export const chatTrace = (chatData: Record<string, any>) => {
  // 这里不再需要 filter，因为这个 logger 只会写向 trace 文件
  traceLogger.info({ ...chatData, is_chat: true, timestamp: new Date().toISOString() })
}