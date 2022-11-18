import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SubmitContributionRequest {
  contribution: string
}

export const submitContribution = async (
  request: AuthorizedRequest<SubmitContributionRequest>,
  env: Env
): Promise<Response> => {
  const {
    activeSurvey,
    parsedBody: { data },
  } = request
  // Get active survey.
  if (!activeSurvey) {
    return respondError(400, 'There is no active survey.')
  }
  // Ensure contributions are being accepted.
  if (activeSurvey.status !== SurveyStatus.AcceptingContributions) {
    return respondError(400, 'Contributions are not being accepted.')
  }

  if (
    !objectMatchesStructure(data, { contribution: {} }) ||
    !data.contribution.trim()
  ) {
    return respondError(400, 'Missing contribution.')
  }

  // Make contribution. Updates if already exists.
  const timestamp = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO contributions (surveyId, contributorPublicKey, content, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(surveyId, contributorPublicKey) DO UPDATE SET content = ?3, updatedAt = ?5'
  )
    .bind(
      activeSurvey.surveyId,
      data.auth.publicKey,
      data.contribution,
      timestamp,
      timestamp
    )
    .run()

  return respond(200, { success: true })
}
