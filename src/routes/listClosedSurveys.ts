import { AuthorizedRequest, Env } from '../types'
import { respond } from '../utils'

interface ClosedSurveyRow {
  surveyId: number
  name: string
  contributionCount: number
  contributionsOpenAt: string
}

export const listClosedSurveys = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Get closed surveys for DAO. Closed meaning the rating period is over. It
  // may or may not have a proposalId set.
  const closedSurveys =
    (
      await env.DB.prepare(
        "SELECT surveyId, name, (SELECT COUNT(*) FROM contributions WHERE contributions.surveyId = surveys.surveyId) as contributionCount, contributionsOpenAt FROM surveys WHERE dao = ?1 AND ratingsCloseAt <= DATETIME('now') ORDER BY ratingsCloseAt DESC"
      )
        .bind(request.dao)
        .all<ClosedSurveyRow>()
    ).results ?? []

  const surveys = closedSurveys.map(
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
