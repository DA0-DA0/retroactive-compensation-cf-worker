import { SurveyWithMetadata, AuthorizedRequest, Env, SurveyRow } from '../types'
import { getSurveyJson, respond, respondError, surveyForRow } from '../utils'

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
    surveyRows.map(async (row) => {
      const survey = surveyForRow(row)
      // Get user contribution if exists.
      const contribution = await env.DB.prepare(
        'SELECT content, ratingsJson FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
      )
        .bind(survey.id, wallet)
        .first<{ content: string; ratingsJson: string | null } | undefined>()

      // Check if user submitted rating.
      const walletRatingCount = await env.DB.prepare(
        'SELECT COUNT(*) FROM ratings WHERE surveyId = ?1 AND raterPublicKey = ?2'
      )
        .bind(survey.id, wallet)
        .first<number>('COUNT(*)')

      const rated =
        typeof walletRatingCount === 'number' && walletRatingCount > 0

      const status: SurveyWithMetadata = {
        survey: getSurveyJson(survey),
        contribution: contribution?.content || null,
        contributionSelfRatings: contribution?.ratingsJson
          ? JSON.parse(contribution.ratingsJson)
          : null,
        rated,
      }

      return status
    })
  )

  return respond(200, {
    surveys,
  })
}
