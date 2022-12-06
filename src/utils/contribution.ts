import { Contribution, Env } from '../types'

interface ContributionRow {
  id: number
  nominatedBy: string | null
  contributor: string
  content: string
  createdAt: string
  updatedAt: string
}

export const getContributions = async (
  { DB }: Env,
  surveyId: number
): Promise<Contribution[]> => {
  const contributions =
    (
      await DB.prepare(
        'SELECT contributionId AS id, nominatedByPublicKey AS nominatedBy, contributorPublicKey AS contributor, content, createdAt, updatedAt FROM contributions WHERE surveyId = ?1'
      )
        .bind(surveyId)
        .all<ContributionRow>()
    ).results ?? []

  return contributions
}
