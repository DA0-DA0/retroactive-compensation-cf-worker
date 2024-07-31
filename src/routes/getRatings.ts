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
  // Get survey.
  const { survey } = request
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }

  // Ensure ratings are no longer being accepted.
  if (
    survey.status !== SurveyStatus.AwaitingCompletion &&
    survey.status !== SurveyStatus.Complete
  ) {
    return respondError(401, 'The rating period has not yet ended.')
  }

  // Get contributions.
  const contributions = await getContributions(env, survey.id)

  // Get ratings.
  const ratings = await _getRatings(
    env,
    request.parsedBody.data.auth.chainId,
    request.parsedBody.data.auth.chainBech32Prefix,
    survey
  )

  return respond(200, {
    contributions,
    ratings,
  })
}
