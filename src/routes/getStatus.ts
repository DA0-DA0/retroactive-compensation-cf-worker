import { SurveyWithMetadata, AuthorizedRequest, Env } from '../types'
import { getSurveyJson, respond, respondError } from '../utils'

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

  // Get user contribution if exists.
  const contribution = await env.DB.prepare(
    'SELECT content, ratingsJson FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
  )
    .bind(survey.id, wallet)
    .first<{ content: string; ratingsJson: string | null } | undefined>()

  // Check if user submitted rating.
  const walletRatingCount = await env.DB.prepare(
    'SELECT COUNT(*) FROM ratings WHERE surveyId = ?1 AND raterPublicKey = ?2'
  )
    .bind(survey.id, wallet)
    .first<number>('COUNT(*)')

  const rated = typeof walletRatingCount === 'number' && walletRatingCount > 0

  const status: SurveyWithMetadata = {
    survey: getSurveyJson(survey),
    contribution: contribution?.content || null,
    contributionSelfRatings: contribution?.ratingsJson
      ? JSON.parse(contribution.ratingsJson)
      : null,
    rated,
  }

  return respond(200, status)
}
