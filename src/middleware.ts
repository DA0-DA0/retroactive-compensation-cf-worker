import { AuthorizedRequest, Env } from './types'
import { getSurvey, respondError } from './utils'

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

export const loadSurveyByUuidForDao = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response | void> => {
  const uuid = request.params?.uuid
  if (!uuid) {
    return respondError(400, 'Missing or invalid survey ID.')
  }

  // Add UUID and survey to request.
  request.uuid = uuid
  request.survey = await getSurvey(env, request.dao, uuid)
}
