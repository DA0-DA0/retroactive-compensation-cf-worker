import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import {
  getContributions,
  getRankings as _getRankings,
  respond,
  respondError,
} from '../utils'

export const getRankings = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Ensure active survey exists.
  const { activeSurvey } = request
  if (!activeSurvey) {
    return respondError(404, 'There is no active survey.')
  }
  // Ensure rankings are no longer being accepted.
  if (
    activeSurvey.status !== SurveyStatus.AwaitingCompletion &&
    activeSurvey.status !== SurveyStatus.Complete
  ) {
    return respondError(401, 'The ranking period has not yet ended.')
  }

  // Get contributions.
  const contributions = await getContributions(env, activeSurvey.surveyId)

  // Get rankings.
  const rankings = await _getRankings(env, activeSurvey.surveyId)

  return respond(200, {
    contributions,
    rankings,
  })
}
