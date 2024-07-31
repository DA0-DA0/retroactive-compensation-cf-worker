import groupBy from 'lodash.groupby'
import { AuthorizedRequest, Env, RatingRow, SurveyStatus } from '../types'
import {
  getContributions as _getContributions,
  respond,
  respondError,
} from '../utils'

export const getContributions = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Get survey.
  const { survey } = request
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }

  // Ensure contributions have started being accepted.
  if (survey.status === SurveyStatus.Inactive) {
    return respondError(
      400,
      'The contribution submission period has not begun.'
    )
  }

  const contributions = await _getContributions(env, survey.id)

  // Get ratings for rater.
  const ratingRows =
    (
      await env.DB.prepare(
        'SELECT contributionId, attributeIndex, rating FROM ratings WHERE surveyId = ?1 AND raterPublicKey = ?2'
      )
        .bind(survey.id, request.parsedBody.data.auth.publicKey)
        .all<Omit<RatingRow, 'raterPublicKey'>>()
    ).results ?? []

  // Group ratings by contribution. Each group should match the number of
  // survey attributes.
  const contributionGroupedRatingRows = groupBy(
    ratingRows,
    (row) => row.contributionId
  )

  const ratings = Object.entries(contributionGroupedRatingRows).map(
    ([contributionId, contributionRatingRows]) => ({
      contributionId: parseInt(contributionId, 10),
      attributes: contributionRatingRows
        // Match order of survey attributes in case the query returned out of
        // order or any operations changed the order, which they shouldn't.
        .sort((a, b) => a.attributeIndex - b.attributeIndex)
        .map((row) => row.rating),
    })
  )

  return respond(200, {
    contributions,
    ratings,
  })
}
