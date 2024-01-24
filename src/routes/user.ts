import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { auth } from '@/middlewares'
import { db } from '@/utils'
import { validator } from '../middlewares/validator'
import { z } from 'zod'

const userRouter = new Hono()

userRouter.use('*', auth)
userRouter.delete('/del/:id', async c => {
  const { id } = c.req.param()
  if (!id) return c.json({ message: 'The field: id is mandatory.' })

  try {
    await db.user.delete({ where: { id: Number(id) } })
    return c.json({ user: `User ID: ${id} removed.` })
  } catch (error) {
    return c.json({
      message: `Error deleting user ID: ${id}, Error: ${error}`
    })
  }
})

userRouter.get('/me', async c => {
  return c.json({ user: c.get('user') })
})

userRouter.get('/all', async c => {
  const users = await db.user.findMany({})
  const total = await db.user.count({})

  if (users) return c.json({ users, total })

  return c.json({ message: 'Error retrieving users' })
})

export { userRouter, userNoAuthRouter }

const userNoAuthRouter = new Hono()
userNoAuthRouter.post(
  '/signup',
  validator(
    z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6, 'Email must be at least 6 characters long.')
    })
  ),
  async c => {
    const data = c.req.valid('form')

    const hash = await Bun.password.hash(data.password)
    data.password = hash

    const userExists = await db.user.findMany({
      where: {
        OR: [{ name: data.name }, { email: data.email }]
      }
    })
    if (userExists.length > 0) return c.json({ user: 'The user/email already exists.' })

    const user = await db.user.create({ data })
    if (user) return c.json({ user: 'User created.' })

    return c.json({ message: 'Error creating user.' })
  }
)

// Login
userNoAuthRouter.post(
  '/signin',
  validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6, 'Email must be at least 6 characters long.')
    })
  ),
  async c => {
    if (!Bun.env.JWT_ACCESS_SECRET || !Bun.env.JWT_REFRESH_SECRET) return c.json({ message: 'JWT passwords need to be configured.' })
    const data = c.req.valid('form')

    const user = await db.user.findUnique({ where: { email: data.email } })
    if (!user) return c.json({ message: 'User not found.' })

    const isMatch = await Bun.password.verify(data.password, user.password)
    if (!isMatch) return c.json({ message: 'Invalid credentials' }, 401)

    const now = Math.floor(Date.now() / 1000)
    const minutes = 15
    const days = 7

    const payload = { sub: user.id, name: user.name, role: 'admin' }

    // Creation of access token with 15-minute expiration
    const accessToken = await sign({ ...payload, iat: now, nbf: now, exp: now + 60 * minutes }, Bun.env.JWT_ACCESS_SECRET)

    // Creation of refresh token with 7-day expiration
    const refreshToken = await sign({ ...payload, iat: now, nbf: now, exp: now + 60 * 60 * 24 * days }, Bun.env.JWT_REFRESH_SECRET)

    await db.token.create({
      data: {
        token: accessToken,
        userId: user.id
      }
    })

    // Return both tokens in the response
    return c.json({ tokens: { access: accessToken, refresh: refreshToken } })
  }
)
