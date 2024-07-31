import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface CompleteSurveyRequest {
  proposalId: string
}

export const completeSurvey = async (
  request: AuthorizedRequest<CompleteSurveyRequest>,
  env: Env
): Promise<Response> => {
  const {
    survey,
    parsedBody: { data },
  } = request

  // Get survey.
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }

  // Ensure ready to complete.
  if (survey.status !== SurveyStatus.AwaitingCompletion) {
    return respondError(
      400,
      'This survey cannot be completed. Status: ' + survey.status
    )
  }

  if (!objectMatchesStructure(data, { proposalId: {} })) {
    return respondError(400, 'Missing proposalId.')
  }

  // Update survey.
  const timestamp = new Date().toISOString()
  await env.DB.prepare(
    'UPDATE surveys SET proposalId = ?1, updatedAt = ?2 WHERE surveyId = ?3'
  )
    .bind(data.proposalId, timestamp, survey.id)
    .run()

  return respond(200, { success: true })
}
