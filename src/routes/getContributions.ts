import groupBy from 'lodash.groupby'
import { AuthorizedRequest, Env, RankingRow, SurveyStatus } from '../types'
import {
  getContributions as _getContributions,
  respond,
  respondError,
} from '../utils'

export const getContributions = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Ensure active survey exists.
  const { activeSurvey } = request
  if (!activeSurvey) {
    return respondError(404, 'There is no active survey.')
  }
  // Ensure contributions have started being accepted.
  if (activeSurvey.status === SurveyStatus.Inactive) {
    return respondError(
      400,
      'The contribution submission period has not begun.'
    )
  }

  const contributions = await _getContributions(env, activeSurvey.surveyId)

  // Get rankings for ranker.
  const rankingRows =
    (
      await env.DB.prepare(
        'SELECT contributionId, attributeIndex, ranking FROM rankings WHERE surveyId = ?1 AND rankerPublicKey = ?2'
      )
        .bind(activeSurvey.surveyId, request.parsedBody.data.auth.publicKey)
        .all<Omit<RankingRow, 'rankerPublicKey'>>()
    ).results ?? []

  // Group rankings by contribution. Each group should match the number of
  // survey attributes.
  const contributionGroupedRankingRows = groupBy(
    rankingRows,
    (row) => row.contributionId
  )

  const rankings = Object.entries(contributionGroupedRankingRows).map(
    ([contributionId, contributionRankingRows]) => ({
      contributionId: parseInt(contributionId, 10),
      attributes: contributionRankingRows
        // Match order of survey attributes in case the query returned out of
        // order or any operations changed the order, which they shouldn't.
        .sort((a, b) => a.attributeIndex - b.attributeIndex)
        .map((row) => row.ranking),
    })
  )

  return respond(200, {
    contributions,
    rankings,
  })
}
