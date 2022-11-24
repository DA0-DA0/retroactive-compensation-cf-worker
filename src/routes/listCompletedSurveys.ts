import { AuthorizedRequest, Env } from '../types'
import { respond } from '../utils'

interface CompletedSurveyRow {
  surveyId: number
  name: string
  contributionCount: number
  contributionsOpenAt: string
}

export const listCompletedSurveys = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Get completed surveys for DAO. Completed meaning the rating period is over. It
  // may or may not have a proposalId set.
  const completedSurveys =
    (
      await env.DB.prepare(
        "SELECT surveyId, name, (SELECT COUNT(*) FROM contributions WHERE contributions.surveyId = surveys.surveyId) as contributionCount, contributionsOpenAt FROM surveys WHERE dao = ?1 AND ratingsCloseAt <= DATETIME('now') ORDER BY ratingsCloseAt DESC"
      )
        .bind(request.dao)
        .all<CompletedSurveyRow>()
    ).results ?? []

  const surveys = completedSurveys.map(
    ({ surveyId, name, contributionCount, contributionsOpenAt }) => ({
      id: surveyId,
      name,
      contributionCount,
      openedAt: contributionsOpenAt,
    })
  )

  return respond(200, {
    surveys,
  })
}
