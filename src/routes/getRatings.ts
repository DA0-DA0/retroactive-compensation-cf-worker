import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import {
  getContributions,
  getRatings as _getRatings,
  respond,
  respondError,
} from '../utils'

export const getRatings = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Ensure active survey exists.
  const { activeSurvey } = request
  if (!activeSurvey) {
    return respondError(404, 'There is no active survey.')
  }
  // Ensure ratings are no longer being accepted.
  if (
    activeSurvey.status !== SurveyStatus.AwaitingCompletion &&
    activeSurvey.status !== SurveyStatus.Complete
  ) {
    return respondError(401, 'The rating period has not yet ended.')
  }

  // Get contributions.
  const contributions = await getContributions(env, activeSurvey.surveyId)

  // Get ratings.
  const ratings = await _getRatings(env, activeSurvey.surveyId)

  return respond(200, {
    contributions,
    ratings,
  })
}
