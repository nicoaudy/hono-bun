import { Hono } from 'hono'
import { userRouter, userNoAuthRouter } from '@/routes'

const app = new Hono()

app.route('/user', userNoAuthRouter)
app.route('/user', userRouter)

app.get('/', c => c.text('User API'))

export default { port: Bun.env.APP_PORT, fetch: app.fetch }
