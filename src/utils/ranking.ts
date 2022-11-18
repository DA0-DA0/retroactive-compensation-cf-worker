import groupBy from 'lodash.groupby'
import { Env, Ranking, RankingRow } from '../types'

export const getRankings = async (
  { DB }: Env,
  surveyId: number
): Promise<Ranking[]> => {
  // Get rankings.
  const rankingRows =
    (
      await DB.prepare(
        'SELECT contributionId, attributeIndex, rankerPublicKey, ranking FROM rankings WHERE surveyId = ?1'
      )
        .bind(surveyId)
        .all<RankingRow>()
    ).results ?? []

  // Group rankings by ranker.
  const rankerGroupedRankingRows = groupBy(
    rankingRows,
    (row) => row.rankerPublicKey
  )

  // Build rankings.
  const rankings = Object.entries(rankerGroupedRankingRows).map(
    ([ranker, rankerRankingRows]): Ranking => {
      // Group rankings by contribution. Each group should match the number of
      // survey attributes.
      const contributionGroupedRankingRows = groupBy(
        rankerRankingRows,
        (row) => row.contributionId
      )

      const contributions = Object.entries(contributionGroupedRankingRows).map(
        ([
          contributionId,
          contributionRankingRows,
        ]): Ranking['contributions'][number] => ({
          id: parseInt(contributionId, 10),
          attributes: contributionRankingRows
            // Match order of survey attributes in case the query returned out
            // of order or any operations changed the order, which they
            // shouldn't.
            .sort((a, b) => a.attributeIndex - b.attributeIndex)
            .map((row) => row.ranking),
        })
      )

      return { ranker, contributions }
    }
  )

  return rankings
}
