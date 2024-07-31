import { AuthorizedRequest, Env, SurveyRow } from '../types'
import {
  getSurveyWithMetadata,
  respond,
  respondError,
  surveyForRow,
} from '../utils'

export const listSurveys = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  const wallet = request.params?.wallet
  if (!wallet) {
    return respondError(400, 'Missing wallet.')
  }

  const surveyRows =
    (
      await env.DB.prepare(
        'SELECT *, (SELECT COUNT(*) FROM contributions WHERE contributions.surveyId = id) as contributionCount FROM surveys WHERE dao = ?1'
      )
        .bind(request.dao)
        .all<SurveyRow>()
    ).results ?? []

  const surveys = await Promise.all(
    surveyRows.map((row) =>
      getSurveyWithMetadata(env, surveyForRow(row), wallet)
    )
  )

  return respond(200, {
    surveys,
  })
}
