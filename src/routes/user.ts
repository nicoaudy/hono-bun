import { Hono } from 'hono'
import { z } from 'zod'
import { auth, validator } from '@/middlewares'
import { db, generateTokens } from '@/utils'

const userRouter = new Hono()

userRouter.use('*', auth)
userRouter.delete('/del/:id', async (c) => {
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

userRouter.get('/me', async (c) => {
  return c.json({ user: c.get('user') })
})

userRouter.get('/all', async (c) => {
  const users = await db.user.findMany()
  const total = await db.user.count()

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
  async (c) => {
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
  async (c) => {
    const data = c.req.valid('form')

    const user = await db.user.findUnique({ where: { email: data.email } })
    if (!user) return c.json({ message: 'User not found.' })

    const isMatch = await Bun.password.verify(data.password, user.password)
    if (!isMatch) return c.json({ message: 'Invalid credentials' }, 401)

    const { accessToken, refreshToken } = await generateTokens(user)

    await db.token.create({
      data: {
        token: accessToken,
        userId: user.id
      }
    })

    return c.json({ tokens: { access: accessToken, refresh: refreshToken } })
  }
)
