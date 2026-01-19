import tiktoken, { Tiktoken } from 'tiktoken'

// 缓存编码器实例
const encoderCache = new Map<string, Tiktoken>()

/**
 * 获取编码器（统一使用 cl100k_base）
 */
function getEncoder(): Tiktoken {
  const encodingName = 'cl100k_base'
  
  if (!encoderCache.has(encodingName)) {
    encoderCache.set(encodingName, tiktoken.encoding_for_model(encodingName as any))
  }
  
  return encoderCache.get(encodingName)!
}

/**
 * 计算文本的 token 数量
 */
export function countTokens(text: string): number {
  try {
    const encoder = getEncoder()
    return encoder.encode(text).length
  } catch (error) {
    console.error('Token 计算失败:', error)
    return 0
  }
}

/**
 * 计算消息列表的总 token 数
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>
): number {
  const encoder = getEncoder()
  let total = 0

  for (const msg of messages) {
    const messageStr = `<|im_start|>${msg.role}\n${msg.content}<|im_end|>`
    total += encoder.encode(messageStr).length
  }

  total += encoder.encode('<|im_end|>').length

  return total
}

/**
 * 释放编码器资源（应用关闭时调用）
 */
export function disposeEncoders(): void {
  for (const encoder of encoderCache.values()) {
    encoder.free()
  }
  encoderCache.clear()
}
