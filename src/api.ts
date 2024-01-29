import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { userRouter, userNoAuthRouter } from '@/routes'

const app = new Hono()

app.use(cors())
app.use(logger())

app.route('/user', userNoAuthRouter)
app.route('/user', userRouter)

app.get('/', (c) => c.text('User API'))

export default { port: Bun.env.APP_PORT, fetch: app.fetch }
