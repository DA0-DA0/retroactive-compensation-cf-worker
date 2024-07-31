import { Contribution, Env } from '../types'

interface ContributionRow {
  id: number
  nominatedBy: string | null
  contributor: string
  content: string
  filesJson: string | null
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
        'SELECT contributionId AS id, nominatedByPublicKey AS nominatedBy, contributorPublicKey AS contributor, content, filesJson, ratingsJson, createdAt, updatedAt FROM contributions WHERE surveyId = ?1'
      )
        .bind(surveyId)
        .all<ContributionRow>()
    ).results ?? []

  return rows.map(
    ({ ratingsJson, filesJson, ...row }): Contribution => ({
      ...row,
      files: filesJson ? JSON.parse(filesJson) : null,
      ratings: ratingsJson ? JSON.parse(ratingsJson) : null,
    })
  )
}
