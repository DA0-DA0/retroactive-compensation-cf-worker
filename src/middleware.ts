import { AuthorizedRequest, Env } from './types'
import { getActiveSurvey, respondError } from './utils'

export const loadDaoFromParams = async (
  request: AuthorizedRequest
): Promise<Response | void> => {
  const dao = request.params?.dao
  if (!dao) {
    return respondError(400, 'Missing DAO.')
  }

  // Add DAO to request.
  request.dao = dao
}

export async function loadActiveSurveyForDao(
  request: AuthorizedRequest,
  env: Env
): Promise<Response | void> {
  request.activeSurvey = await getActiveSurvey(env, request.dao)
}
