import { User } from '@prisma/client'
import { sign } from 'hono/jwt'

// Usually I keep the token between 5 minutes - 15 minutes
export async function generateAccessToken(user: User) {
  const secret = Bun.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT access password not configured.')

  const now = Math.floor(Date.now() / 1000)
  const minutes = 15

  const payload = { sub: user.id, name: user.name, role: user.role }
  const token = await sign({ ...payload, iat: now, nbf: now, exp: now + 60 * minutes }, secret)

  return token
}

// I choosed 8h because i prefer to make the user login again each day.
// But keep him logged in if he is using the app.
// You can change this value depending on your app logic.
// I would go for a maximum of 7 days, and make him login again after 7 days of inactivity.
async function generateRefreshToken(user: User) {
  const secret = Bun.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT access password not configured.')

  const now = Math.floor(Date.now() / 1000)
  const days = 7

  const payload = { sub: user.id, name: user.name, role: user.role }

  const refreshToken = await sign(
    { ...payload, iat: now, nbf: now, exp: now + 60 * 60 * 24 * days },
    secret
  )

  return refreshToken
}

export async function generateTokens(user: User) {
  const accessToken = await generateAccessToken(user)
  const refreshToken = await generateRefreshToken(user)
  return { accessToken, refreshToken }
}
