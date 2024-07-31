import groupBy from 'lodash.groupby'
import { Env, Rating, RatingRow, SurveyRow } from '../types'
import { getWalletVotingPowerAtBlockHeight } from './chain'
import { secp256k1PublicKeyToBech32Address } from '../crypto'

export const RATE_MIN = 0
export const RATE_MAX = 100

export const getRatings = async (
  { DB }: Env,
  chainId: string,
  chainBech32Prefix: string,
  survey: SurveyRow
): Promise<Rating[]> => {
  // Get ratings.
  const ratingRows =
    (
      await DB.prepare(
        'SELECT contributionId, attributeIndex, raterPublicKey, rating FROM ratings WHERE surveyId = ?1'
      )
        .bind(survey.id)
        .all<RatingRow>()
    ).results ?? []

  // Group ratings by rater.
  const raterGroupedRatingRows = groupBy(
    ratingRows,
    (row) => row.raterPublicKey
  )

  // Build ratings.
  const ratings = await Promise.all(
    Object.entries(raterGroupedRatingRows).map(
      async ([rater, raterRatingRows]): Promise<Rating> => {
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

        // Get voting power for rater.
        const raterVotingPower = await getWalletVotingPowerAtBlockHeight(
          chainId,
          survey.dao,
          await secp256k1PublicKeyToBech32Address(rater, chainBech32Prefix)
        )

        return {
          rater,
          raterVotingPower,
          contributions,
        }
      }
    )
  )

  return ratings
}
