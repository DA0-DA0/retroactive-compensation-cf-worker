export const respond = (status: number, response?: Record<string, unknown>) =>
  new Response(response ? JSON.stringify(response) : null, {
    status,
  })

export const respondError = (status: number, error: string) =>
  respond(status, { error })
