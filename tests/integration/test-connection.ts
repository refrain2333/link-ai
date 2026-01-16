import pg from 'pg'
import { config } from '@/config'

const { Client } = pg

async function testConnection() {
  const client = new Client({
    connectionString: config.database.url
  })

  try {
    console.log('正在连接数据库...')
    await client.connect()
    console.log('数据库连接成功！')
    await client.end()
  } catch (error) {
    console.error('连接失败:', error)
    process.exit(1)
  }
}

await testConnection()
