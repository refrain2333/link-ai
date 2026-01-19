import { Controller, GET, POST, DELETE, PATCH } from 'fastify-decorators'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AIResponse, StreamEvent, CreateChatParams, SendMessageParams, GetChatListParams } from '@/services/chatService'
import { getChatList, getChat, createChat, deleteChat, sendMessage, ChatError, NotFoundError, updateChatTitle, clearChatMessages, getModelList } from '@/services/chatService'
import { ZodError } from 'zod'
import { authenticate } from '@/middleware/auth.js'

/**
 * 统一错误响应
 */
function handleError(request: FastifyRequest, reply: FastifyReply, err: unknown): void {
  // Zod 校验错误
  if (err instanceof ZodError) {
    const messages = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    reply.code(400).send({
      code: 400,
      message: `参数校验失败: ${messages}`
    })
    return
  }

  // 业务错误（如对话不存在、AI 服务错误）
  if (err instanceof ChatError || err instanceof NotFoundError) {
    request.log.warn({ message: err.message, name: err.name }, '业务错误')
    reply.code(err.statusCode).send({
      code: err.statusCode,
      message: err.message
    })
    return
  }

  // 服务器错误
  request.log.error(err)
  reply.code(500).send({
    code: 500,
    message: '服务器错误'
  })
}

/**
 * 解析 SSE 格式
 */
function toSSE(data: StreamEvent): string {
  if (data.type === 'done') {
    return 'data: [DONE]\n\n'
  }
  if (data.type === 'error') {
    return `data: ${JSON.stringify({ type: 'error', content: data.message })}\n\n`
  }
  return `data: ${JSON.stringify({ type: 'content', content: data.content })}\n\n`
}

/**
 * 聊天控制器
 */
@Controller('/api/chat')
export class ChatController {
  /**
   * 获取对话列表
   */
  @GET('/', {
    onRequest: [authenticate]
  })
  async list(request: FastifyRequest<{ Querystring: GetChatListParams }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const result = await getChatList(userId, request.query)
      reply.send({
        code: 0,
        message: 'success',
        data: result
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 获取对话详情
   */
  @GET('/:chatId', {
    onRequest: [authenticate]
  })
  async detail(request: FastifyRequest<{ Params: { chatId: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const chat = await getChat(userId, request.params.chatId)
      reply.send({
        code: 0,
        message: 'success',
        data: chat
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 创建新对话
   */
  @POST('/', {
    onRequest: [authenticate]
  })
  async create(request: FastifyRequest<{ Body: CreateChatParams }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const chat = await createChat(userId, request.body)
      reply.code(201).send({
        code: 0,
        message: '创建成功',
        data: chat
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 删除对话
   */
  @DELETE('/:chatId', {
    onRequest: [authenticate]
  })
  async delete(request: FastifyRequest<{ Params: { chatId: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      await deleteChat(userId, request.params.chatId)
      reply.send({
        code: 0,
        message: '删除成功'
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 更新对话标题
   */
  @PATCH('/:chatId/title', {
    onRequest: [authenticate]
  })
  async updateTitle(request: FastifyRequest<{ Params: { chatId: string }; Body: { title: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      const { title } = request.body
      await updateChatTitle(userId, request.params.chatId, title)
      reply.send({
        code: 0,
        message: '更新成功'
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 清空对话消息
   */
  @DELETE('/:chatId/messages', {
    onRequest: [authenticate]
  })
  async clearMessages(request: FastifyRequest<{ Params: { chatId: string } }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      await clearChatMessages(userId, request.params.chatId)
      reply.send({
        code: 0,
        message: '清空成功'
      })
    } catch (err) {
      handleError(request, reply, err)
    }
  }

  /**
   * 获取模型列表（公开接口）
   */
  @GET('/models')
  async listModels(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const models = await getModelList()
      reply.send({
        code: 0,
        message: 'success',
        data: models
      })
    } catch (err) {
      handleError(_request, reply, err)
    }
  }

  /**
   * 发送消息（流式输出）
   *
   * SSE 响应格式：
   * - Content-Type: text/event-stream
   * - Cache-Control: no-cache
   * - Connection: keep-alive
   * - Data: {"type": "content", "content": "xxx"}\n\n
   * - 结束: data: [DONE]\n\n
   */
  @POST('/message', {
    onRequest: [authenticate]
  })
  async sendMessage(request: FastifyRequest<{ Body: SendMessageParams }>, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user?.userId
      if (!userId) {
        reply.status(401).send({
          code: 401,
          message: '未登录',
          data: null
        })
        return
      }

      // 设置 SSE 响应头
      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

      // 初始空数据触发 SSE 连接
      reply.raw.write(toSSE({ type: 'content', content: '' }))

      // 流式发送消息
      const result = await sendMessage(userId, request.body, (chunk) => {
        reply.raw.write(toSSE(chunk))
      })

      // 发送元数据（非 SSE 格式，用特殊标记分隔）
      reply.raw.write(`data: ${JSON.stringify({ type: 'meta', data: result })}\n\n`)
      reply.raw.end()

    } catch (err) {
      if (!reply.sent) {
        handleError(request, reply, err)
      } else {
        // 流已开启，发送错误事件
        if (err instanceof ChatError) {
          reply.raw.write(toSSE({ type: 'error', message: err.message }))
        } else {
          reply.raw.write(toSSE({ type: 'error', message: '服务器错误' }))
        }
        reply.raw.end()
      }
    }
  }
}
