import { AuthorizedRequest, Env } from '../types'
import { getSurveyWithMetadata, respond, respondError } from '../utils'

export const getStatus = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  const wallet = request.params?.wallet
  if (!wallet) {
    return respondError(400, 'Missing wallet.')
  }

  // Get survey.
  const { survey } = request
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }

  const surveyWithMetadata = await getSurveyWithMetadata(env, survey, wallet)

  return respond(200, surveyWithMetadata)
}
