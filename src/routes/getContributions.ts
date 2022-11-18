import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import {
  getContributions as _getContributions,
  respond,
  respondError,
} from '../utils'

export const getContributions = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Ensure active survey exists.
  const { activeSurvey } = request
  if (!activeSurvey) {
    return respondError(404, 'There is no active survey.')
  }
  // Ensure contributions have started being accepted.
  if (activeSurvey.status === SurveyStatus.Inactive) {
    return respondError(
      400,
      'The contribution submission period has not begun.'
    )
  }

  const contributions = await _getContributions(env, activeSurvey.surveyId)

  return respond(200, {
    contributions,
  })
}
