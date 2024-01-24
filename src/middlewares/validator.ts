import type { Env, MiddlewareHandler } from 'hono'
import type { z, ZodSchema } from 'zod'

export const validator =
  <
    T extends ZodSchema,
    E extends Env,
    P extends string,
    O = z.output<T>,
    V extends {
      out: { form: O }
    } = {
      out: { form: O }
    }
  >(
    schema: T
  ): MiddlewareHandler<E, P, V> =>
  async (c, next): Promise<Response | void> => {
    const contentType = c.req.header('Content-Type') || ''
    let value = {}
    if (contentType.startsWith('application/json')) {
      value = await c.req.json().catch(() => ({}))
    } else {
      value = await c.req.parseBody({ all: true }).catch(() => ({}))
    }
    const result = await schema.safeParseAsync(value)

    if (!result.success) {
      const customResult = {
        success: false,
        message: 'Bad request',
        errors: result.error.flatten().fieldErrors
      }

      return c.json(customResult, 400)
    }

    const data = result.data as z.infer<T>
    c.req.addValidatedData('form', data)

    await next()
  }
