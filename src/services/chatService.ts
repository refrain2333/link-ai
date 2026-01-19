import OpenAI from 'openai'
import { z } from 'zod'
import { prisma } from '@/db'
import { logger } from '@/utils/logger'
import { countMessageTokens, countTokens } from '@/utils/tiktoken'
import type { ChatCompletionChunk } from 'openai/resources'

// ==================== 类型定义 ====================

// 流式响应中的事件类型
export type StreamEvent = 
  | { type: 'content'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

// AI 回复结果
export interface AIResponse {
  content: string           // AI 生成的完整回复文本
  reasoning: string | null  // 推理过程内容（部分模型如 DeepSeek/o1 支持）
  modelId: string           // 使用的模型 ID（如 gpt-4o、deepseek-chat）
  modelName: string         // 模型显示名称（如 GPT-4o、DeepSeek Chat）
  duration: number          // 响应耗时（单位：秒）
  usage: {                  // Token 使用统计
    promptTokens: number    // 输入 prompt 消耗的 token 数量
    completionTokens: number // 模型回复消耗的 token 数量
    totalTokens: number     // 总消耗 token = prompt + completion
  }
}

// ==================== 错误类型 ====================

export class ChatError extends Error {
  statusCode = 400
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ChatError'
    this.statusCode = statusCode
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  constructor(resource: string) {
    super(`${resource}不存在`)
    this.name = 'NotFoundError'
    this.statusCode = 404
  }
}

// ==================== 公共 Schema 定义 ====================

// 创建对话 Schema
const createChatSchema = z.object({
  title: z.string()
    .trim()
    .min(1, { message: '标题不能为空' })
    .max(255, { message: '标题不能超过255个字符' })
    .optional()
    .default('新对话'),
  modelId: z.string().optional() // 可选，指定模型，不指定则使用默认模型
})
export { createChatSchema }
export type CreateChatParams = z.infer<typeof createChatSchema>

// 发送消息 Schema
const sendMessageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: '消息内容不能为空' })
    .max(10000, { message: '消息内容不能超过10000个字符' }),
  chatId: z.string().optional(), // 可选，不传则创建新对话
  stream: z.boolean().optional().default(true) // 是否使用流式输出，默认 true
})
export { sendMessageSchema }
export type SendMessageParams = z.infer<typeof sendMessageSchema>

// 获取对话列表 Schema
const getChatListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})
export { getChatListSchema }
export type GetChatListParams = z.infer<typeof getChatListSchema>

// ==================== 辅助函数 ====================

/**
 * 获取对话列表的 Prisma 查询配置
 */
function getChatListQuery(userId: string, page: number, pageSize: number) {
  return {
    where: { userId },
    orderBy: { updatedAt: 'desc' as const },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { role: true, content: true, createdAt: true }
      },
      _count: { select: { messages: true } }
    }
  }
}

/**
 * 格式化对话列表数据
 */
function formatChatList(chats: any[]) {
  return chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    messageCount: chat._count.messages,
    lastMessage: chat.messages[0] ?? null,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  }))
}
async function getDefaultModel(): Promise<{
  id: string
  name: string
  modelId: string
  provider: string
  baseUrl: string | null
  apiKey: string | null
}> {
  const model = await prisma.aIModel.findFirst({
    where: { enabled: true }
  })

  if (!model) {
    throw new ChatError('没有可用的 AI 模型配置，请联系管理员')
  }

  return {
    id: model.id,
    name: model.name,
    modelId: model.modelId,
    provider: model.provider,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey
  }
}

/**
 * 初始化 OpenAI 客户端
 */
function initOpenAIClient(model: {
  baseUrl: string | null
  apiKey: string | null
}): OpenAI {
  if (!model.baseUrl || !model.apiKey) {
    throw new ChatError('模型配置不完整，缺少 baseUrl 或 apiKey')
  }
  return new OpenAI({
    baseURL: model.baseUrl,
    apiKey: model.apiKey
  })
}

/**
 * 将数据库消息转换为 OpenAI 格式
 */
function messagesToOpenAIFormat(messages: Array<{
  role: 'system' | 'user' | 'assistant'
  content: string
}>): Array<OpenAI.Chat.ChatCompletionMessageParam> {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }))
}

// ==================== 核心业务函数 ====================

/**
 * 获取用户的对话列表
 */
export async function getChatList(userId: string, params: GetChatListParams) {
  const { page, pageSize } = getChatListSchema.parse(params)

  const query = getChatListQuery(userId, page, pageSize)

  const [chats, total] = await Promise.all([
    prisma.chat.findMany(query),
    prisma.chat.count({ where: { userId } })
  ])

  logger.info({ userId, page, pageSize, total }, '获取对话列表成功')

  return {
    list: formatChatList(chats),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

/**
 * 获取单个对话详情（包含消息列表）
 */
export async function getChat(userId: string, chatId: string) {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          reasoning: true,
          role: true,
          modelName: true,
          modelId: true,
          duration: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          createdAt: true
        }
      }
    }
  })

  if (!chat) {
    throw new NotFoundError('对话')
  }

  logger.info({ userId, chatId, messageCount: chat.messages.length }, '获取对话详情成功')

  return chat
}

/**
 * 创建新对话
 */
export async function createChat(userId: string, params: CreateChatParams) {
  const { title, modelId: specifiedModelId } = createChatSchema.parse(params)

  // 验证指定的模型是否存在且可用
  let modelConfig: {
    id: string
    name: string
    modelId: string
    provider: string
  } | null = null

  if (specifiedModelId) {
    modelConfig = await prisma.aIModel.findFirst({
      where: { id: specifiedModelId, enabled: true },
      select: { id: true, name: true, modelId: true, provider: true }
    })

    if (!modelConfig) {
      throw new ChatError('指定的模型不存在或已禁用')
    }
  } else {
    modelConfig = await getDefaultModel()
  }

  const chat = await prisma.chat.create({
    data: {
      userId,
      title,
      modelId: modelConfig.id,
      modelName: modelConfig.name,
      messages: {
        create: [] // 初始不创建消息
      }
    } as any,
    include: {
      messages: false
    }
  })

  logger.info({ userId, chatId: chat.id, modelId: modelConfig.id }, '创建对话成功')

  return {
    id: chat.id,
    title: chat.title,
    model: {
      id: modelConfig.id,
      name: modelConfig.name,
      modelId: modelConfig.modelId
    },
    createdAt: chat.createdAt
  }
}

/**
 * 删除对话
 */
export async function deleteChat(userId: string, chatId: string) {
  // 先验证对话是否存在且属于该用户
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId }
  })

  if (!chat) {
    throw new NotFoundError('对话')
  }

  await prisma.chat.delete({
    where: { id: chatId }
  })

  logger.info({ userId, chatId }, '删除对话成功')

  return { success: true }
}

/**
 * 获取对话历史消息（用于上下文组装）
 */
export async function getChatHistory(chatId: string, limit = 10) {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      role: true,
      content: true
    }
  })

  // 反转，按时间正序返回
  return messages.reverse().map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content
  }))
}

/**
 * 发送消息（流式输出核心逻辑）
 * 
 * @param userId 用户ID
 * @param params 消息参数
 * @param onChunk 流式回调函数，每收到一个 chunk 调用一次
 */
export async function sendMessage(
  userId: string,
  params: SendMessageParams,
  onChunk?: (chunk: StreamEvent) => void
): Promise<AIResponse> {
  const { content, chatId: specifiedChatId, stream: useStream } = sendMessageSchema.parse(params)

  // 1. 确定使用的模型
  let modelConfig: {
    id: string
    name: string
    modelId: string
    provider: string
    baseUrl: string | null
    apiKey: string | null
  }
  let chatId: string
  let existingMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

  if (specifiedChatId) {
    // 验证对话是否存在
    const chat = await prisma.chat.findFirst({
      where: { id: specifiedChatId, userId },
      select: { id: true, modelId: true, modelName: true }
    } as any)

    if (!chat) {
      throw new NotFoundError('对话')
    }

    chatId = specifiedChatId

    // 如果对话有 modelId，使用对话指定的模型；否则使用默认模型
    if (chat.modelId) {
      const model = await prisma.aIModel.findFirst({
        where: { id: chat.modelId, enabled: true }
      })
      if (model) {
        modelConfig = {
          id: model.id,
          name: model.name,
          modelId: model.modelId,
          provider: model.provider,
          baseUrl: model.baseUrl,
          apiKey: model.apiKey
        }
      } else {
        modelConfig = await getDefaultModel()
      }
    } else {
      modelConfig = await getDefaultModel()
    }

    // 获取历史消息用于上下文
    existingMessages = await getChatHistory(chatId, 10)
  } else {
    // 创建新对话
    modelConfig = await getDefaultModel()
    const newChat = await prisma.chat.create({
      data: {
        userId,
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        modelId: modelConfig.id,
        modelName: modelConfig.name,
        messages: { create: [] }
      } as any,
      select: { id: true }
    })
    chatId = newChat.id
  }

  const openai = initOpenAIClient(modelConfig)

  // 3. 组装消息上下文
  const allMessages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
    ...messagesToOpenAIFormat(existingMessages),
    { role: 'user', content }
  ]

  // 4. 保存用户消息到数据库
  const userMessage = await prisma.message.create({
    data: {
      chatId,
      role: 'USER',
      content
    }
  })

  // 5. 调用 AI 接口（流式）
  const startTime = Date.now()
  let fullContent = ''
  let reasoning: string | null = null
  let usage: AIResponse['usage'] = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  }

  try {
    // 5. 调用 AI 接口
    if (useStream) {
      // ---------- 流式模式 ----------
      const stream = await openai.chat.completions.create({
        model: modelConfig.modelId,
        messages: allMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      })

      // 流式处理响应
      for await (const chunk of stream) {
        const choice = chunk.choices[0]
        if (!choice) continue

        // 处理内容增量
        const deltaContent = choice.delta?.content ?? ''
        if (deltaContent) {
          fullContent += deltaContent
          onChunk?.({ type: 'content', content: deltaContent })
        }

        // 处理 reasoning_content (如 DeepSeek/o1)
        const deltaReasoning = (choice.delta as any)?.reasoning_content ?? null
        if (deltaReasoning) {
          reasoning = (reasoning ?? '') + deltaReasoning
        }

        // 收集 usage（部分 provider 在最后一个 chunk 返回）
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens
          }
        }
      }

      onChunk?.({ type: 'done' })

    } else {
      // ---------- 非流式模式 ----------
      const completion = await openai.chat.completions.create({
        model: modelConfig.modelId,
        messages: allMessages,
        stream: false,
        temperature: 0.7,
        max_tokens: 4096
      })

      const message = completion.choices[0]?.message
      if (message) {
        fullContent = message.content ?? ''
        reasoning = (message as any).reasoning_content ?? null
      }

      if (completion.usage) {
        usage = {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        }
      }

      // 非流式模式下，如果有 onChunk，需要一次性推送完整内容
      if (onChunk && fullContent) {
        onChunk({ type: 'content', content: fullContent })
        onChunk({ type: 'done' })
      }
    }

  } catch (error) {
    logger.error({ userId, chatId, error }, 'AI 调用失败')

    // 删除用户消息（因为对话失败）
    await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => {})

    if (error instanceof OpenAI.APIError) {
      throw new ChatError(`AI 服务错误: ${error.message}`, error.status ?? 500)
    }
    throw new ChatError('AI 服务暂时不可用，请稍后重试', 503)
  }

  const duration = (Date.now() - startTime) / 1000

  // 8. 如果 provider 没返回 usage，使用 tiktoken 本地计算
  if (usage.totalTokens === 0 && allMessages.length > 0) {
    const promptTexts: string[] = []
    for (let i = 0; i < allMessages.length - 1; i++) {
      const msg = allMessages[i]!
      if (typeof msg.content === 'string') {
        promptTexts.push(`${msg.role}: ${msg.content}`)
      }
    }
    usage.promptTokens = countTokens(promptTexts.join('\n'))
    usage.completionTokens = countTokens(fullContent + (reasoning ?? ''))
    usage.totalTokens = usage.promptTokens + usage.completionTokens
  }

  // 9. 异步保存 AI 回复到数据库
  // 使用 transaction 确保数据一致性
  try {
    await prisma.$transaction([
      // 保存 AI 回复
      prisma.message.create({
        data: {
          chatId,
          role: 'ASSISTANT',
          content: fullContent,
          reasoning,
          modelName: modelConfig.name,
          modelId: modelConfig.modelId,
          duration,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens
        }
      }),
      // 更新对话的 updatedAt
      prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      })
    ])

    logger.info({
      userId,
      chatId,
      messageId: userMessage.id,
      modelId: modelConfig.modelId,
      usage
    }, '消息保存成功')

  } catch (error) {
    // 保存失败只记录日志，不影响用户已收到的响应
    logger.error({ userId, chatId, error }, '保存消息失败')
  }

  return {
    content: fullContent,
    reasoning,
    modelId: modelConfig.modelId,
    modelName: modelConfig.name,
    duration,
    usage
  }
}
