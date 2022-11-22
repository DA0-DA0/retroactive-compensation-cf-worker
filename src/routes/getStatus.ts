import { AuthorizedRequest, Env } from '../types'
import { getSurveyJson, respond, respondError } from '../utils'

export const getStatus = async (
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

  // Get user contribution if exists.
  const contribution =
    (
      await env.DB.prepare(
        'SELECT content FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
      )
        .bind(activeSurvey.surveyId, wallet)
        .first<{ content: string } | undefined>()
    )?.content || null

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
    contribution,
    ranked,
  })
}
