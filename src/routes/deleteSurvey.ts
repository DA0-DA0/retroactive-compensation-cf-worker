import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { respond, respondError } from '../utils'

export const deleteSurvey = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Get survey.
  const { survey } = request
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }

  // Ensure contribution and rating periods have not both closed.
  if (
    survey.status === SurveyStatus.AwaitingCompletion ||
    survey.status === SurveyStatus.Complete
  ) {
    return respondError(
      401,
      'The survey cannot be deleted because the submission and rating periods have closed.'
    )
  }

  // Only allow the survey creator to delete the survey.
  if (
    // Backwards compatibility: explicitly ensure creatorPublicKey is set. The
    // authorized requestor's public key below should always be set, so this
    // empty check should be redundant, but just in case...
    !survey.creatorPublicKey ||
    survey.creatorPublicKey !== request.parsedBody.data.auth.publicKey
  ) {
    return respondError(401, 'The survey can only be deleted by the creator.')
  }

  // Delete survey and associated contributions and ratings. Foreign key
  // constraints require that we delete ratings first, then contributions, then
  // the survey.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ratings WHERE surveyId = ?1').bind(survey.id),
    env.DB.prepare('DELETE FROM contributions WHERE surveyId = ?1').bind(
      survey.id
    ),
    env.DB.prepare('DELETE FROM surveys WHERE id = ?1').bind(survey.id),
  ])

  return respond(204)
}
