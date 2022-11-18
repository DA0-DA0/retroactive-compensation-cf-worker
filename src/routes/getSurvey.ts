import { AuthorizedRequest, Env } from '../types'
import { getSurveyJson, respond, respondError } from '../utils'

export const getSurvey = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  const wallet = request.params?.wallet
  if (!wallet) {
    return respondError(400, 'Missing wallet.')
  }

  // Ensure active survey exists.
  const { activeSurvey } = request
  if (!activeSurvey) {
    return respondError(404, 'There is no active survey.')
  }

  // Check if user submitted contribution.
  const walletContributionCount = await env.DB.prepare(
    'SELECT COUNT(*) FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
  )
    .bind(activeSurvey.surveyId, wallet)
    .first<number>('COUNT(*)')

  const contributed =
    typeof walletContributionCount === 'number' && walletContributionCount > 0

  // Check if user submitted ranking.
  const walletRankingCount = await env.DB.prepare(
    'SELECT COUNT(*) FROM rankings WHERE surveyId = ?1 AND rankerPublicKey = ?2'
  )
    .bind(activeSurvey.surveyId, wallet)
    .first<number>('COUNT(*)')

  const ranked =
    typeof walletRankingCount === 'number' && walletRankingCount > 0

  return respond(200, {
    survey: getSurveyJson(activeSurvey),
    contributed,
    ranked,
  })
}
