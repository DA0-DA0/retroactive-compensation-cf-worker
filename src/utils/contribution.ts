import { Contribution, ContributionRow, Env } from '../types'

export const getContributions = async (
  { DB }: Env,
  surveyId: number
): Promise<Contribution[]> => {
  const contributions = await DB.prepare(
    'SELECT contributionId, contributorPublicKey, content, createdAt, updatedAt FROM contributions WHERE surveyId = ?1'
  )
    .bind(surveyId)
    .all<ContributionRow>()

  return (
    contributions.results?.map(
      ({
        contributionId,
        contributorPublicKey,
        content,
        createdAt,
        updatedAt,
      }): Contribution => ({
        id: contributionId,
        contributor: contributorPublicKey,
        content,
        createdAt,
        updatedAt,
      })
    ) ?? []
  )
}
