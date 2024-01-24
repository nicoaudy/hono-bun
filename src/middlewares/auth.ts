import { MiddlewareHandler } from 'hono'
import { verify } from 'hono/jwt'
import { db } from '@/utils'

export const auth: MiddlewareHandler = async (c, next) => {
  if (!Bun.env.JWT_ACCESS_SECRET) return c.json({ message: 'The JWT Access Secret was not found.' })

  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ message: 'Access token not provided.' }, 401)

  const token = authHeader.split(' ')[1]
  if (!token) return c.json({ message: 'Badly formatted access token.' }, 401)

  try {
    const decoded = await verify(token, Bun.env.JWT_ACCESS_SECRET)
    const storedToken = await db.token.findFirst({ where: { token } })

    if (!storedToken) return c.json({ message: 'Invalid access token.' }, 401)

    c.set('user', decoded) // Decoded token payload
    await next()
  } catch (error) {
    return c.json({ message: 'Invalid or expired access token.' }, 401)
  }
}
