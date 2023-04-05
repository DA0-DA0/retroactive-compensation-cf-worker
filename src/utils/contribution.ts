import { Contribution, Env } from '../types'

interface ContributionRow {
  id: number
  nominatedBy: string | null
  contributor: string
  content: string
  ratingsJson: string | null
  createdAt: string
  updatedAt: string
}

export const getContributions = async (
  { DB }: Env,
  surveyId: number
): Promise<Contribution[]> => {
  const rows =
    (
      await DB.prepare(
        'SELECT contributionId AS id, nominatedByPublicKey AS nominatedBy, contributorPublicKey AS contributor, content, ratingsJson, createdAt, updatedAt FROM contributions WHERE surveyId = ?1'
      )
        .bind(surveyId)
        .all<ContributionRow>()
    ).results ?? []

  return rows.map((row) => ({
    ...row,
    ratingsJson: undefined,
    ratings: row.ratingsJson ? JSON.parse(row.ratingsJson) : null,
  }))
}
