import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SubmitNominationRequest {
  contributor: string
  contribution: string
}

export const submitNomination = async (
  request: AuthorizedRequest<SubmitNominationRequest>,
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
  // Ensure ratings (thus nominations) are being accepted.
  if (activeSurvey.status !== SurveyStatus.AcceptingRatings) {
    return respondError(400, 'Nominations are not being accepted.')
  }

  if (
    !objectMatchesStructure(data, {
      contributor: {},
      contribution: {},
    }) ||
    !data.contributor.trim() ||
    !data.contribution.trim()
  ) {
    return respondError(400, 'Missing contributor or contribution.')
  }

  // If contribution exists, only allow to update this rater initially nominated
  // it.
  const existingContribution = await env.DB.prepare(
    'SELECT * FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
  )
    .bind(activeSurvey.surveyId, data.contributor)
    .first<{ nominatedByPublicKey: string | null } | undefined>()
  if (
    existingContribution &&
    existingContribution.nominatedByPublicKey !== data.auth.publicKey
  ) {
    return respondError(
      404,
      existingContribution.nominatedByPublicKey === null
        ? 'Contributor already submitted a contribution.'
        : 'Contributor already nominated by another rater, so you cannot update their contribution.'
    )
  }

  // Make contribution. Updates if already exists.
  await env.DB.prepare(
    'INSERT INTO contributions (surveyId, nominatedByPublicKey, contributorPublicKey, content, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?5) ON CONFLICT(surveyId, contributorPublicKey) DO UPDATE SET content = ?4, updatedAt = ?5'
  )
    .bind(
      activeSurvey.surveyId,
      data.auth.publicKey,
      data.contributor,
      data.contribution,
      new Date().toISOString()
    )
    .run()

  return respond(200, { success: true })
}
