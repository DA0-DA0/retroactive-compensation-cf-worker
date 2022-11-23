import groupBy from 'lodash.groupby'
import { Env, Rating, RatingRow } from '../types'

export const getRatings = async (
  { DB }: Env,
  surveyId: number
): Promise<Rating[]> => {
  // Get ratings.
  const ratingRows =
    (
      await DB.prepare(
        'SELECT contributionId, attributeIndex, raterPublicKey, rating FROM ratings WHERE surveyId = ?1'
      )
        .bind(surveyId)
        .all<RatingRow>()
    ).results ?? []

  // Group ratings by rater.
  const raterGroupedRatingRows = groupBy(
    ratingRows,
    (row) => row.raterPublicKey
  )

  // Build ratings.
  const ratings = Object.entries(raterGroupedRatingRows).map(
    ([rater, raterRatingRows]): Rating => {
      // Group ratings by contribution. Each group should match the number of
      // survey attributes.
      const contributionGroupedRatingRows = groupBy(
        raterRatingRows,
        (row) => row.contributionId
      )

      const contributions = Object.entries(contributionGroupedRatingRows).map(
        ([
          contributionId,
          contributionRatingRows,
        ]): Rating['contributions'][number] => ({
          id: parseInt(contributionId, 10),
          attributes: contributionRatingRows
            // Match order of survey attributes in case the query returned out
            // of order or any operations changed the order, which they
            // shouldn't.
            .sort((a, b) => a.attributeIndex - b.attributeIndex)
            .map((row) => row.rating),
        })
      )

      return { rater, contributions }
    }
  )

  return ratings
}
