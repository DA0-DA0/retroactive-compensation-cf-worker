import { AuthorizedRequest, Env } from '../types'
import { respond } from '../utils'

interface CompletedSurveyRow {
  surveyId: number
  name: string
  contributionCount: number
  contributionsOpenAt: string
  proposalId: string | null
}

export const listCompletedSurveys = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Get completed surveys for DAO. Completed meaning the proposalId has been
  // set, though it may be an empty string.
  const surveys =
    (
      await env.DB.prepare(
        'SELECT surveyId AS id, name, (SELECT COUNT(*) FROM contributions WHERE contributions.surveyId = surveys.surveyId) as contributionCount, contributionsOpenAt, proposalId FROM surveys WHERE dao = ?1 AND proposalId IS NOT NULL ORDER BY ratingsCloseAt DESC'
      )
        .bind(request.dao)
        .all<CompletedSurveyRow>()
    ).results ?? []

  return respond(200, {
    surveys,
  })
}
