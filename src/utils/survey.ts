import { Env, Survey, SurveyJson, SurveyRow, SurveyStatus } from '../types'

export const statusForSurvey = (survey: SurveyRow) => {
  // Get status for survey.
  const contributionsOpenAt = new Date(survey.contributionsOpenAt)
  const contributionsCloseRankingsOpenAt = new Date(
    survey.contributionsCloseRankingsOpenAt
  )
  const rankingsCloseAt = new Date(survey.rankingsCloseAt)
  const now = new Date()
  const status =
    contributionsOpenAt > now
      ? SurveyStatus.Inactive
      : contributionsCloseRankingsOpenAt > now
      ? SurveyStatus.AcceptingContributions
      : rankingsCloseAt > now
      ? SurveyStatus.AcceptingRankings
      : // Complete once proposalId is set.
      !survey.proposalId
      ? SurveyStatus.AwaitingCompletion
      : SurveyStatus.Complete

  return status
}

export const surveyForRow = (survey: SurveyRow): Survey => ({
  ...survey,
  status: statusForSurvey(survey),
  attributes: JSON.parse(survey.attributesJson),
})

// The active survey has rankings not yet closed or has no proposalId, which
// means it is incomplete.
export const getActiveSurvey = async (
  env: Env,
  dao: string
): Promise<Survey | undefined> => {
  // Find active survey.
  const activeSurveyRow = await env.DB.prepare(
    "SELECT * FROM surveys WHERE dao = ?1 AND (rankingsCloseAt > DATETIME('now') OR proposalId IS NULL)"
  )
    .bind(dao)
    .first<SurveyRow | undefined>()

  return activeSurveyRow ? surveyForRow(activeSurveyRow) : undefined
}

export const getSurveyJson = ({
  status,
  name,
  contributionsOpenAt,
  contributionsCloseRankingsOpenAt,
  rankingsCloseAt,
  contributionDescription,
  rankingDescription,
  attributes,
}: Survey): SurveyJson => ({
  status,
  name,
  contributionsOpenAt,
  contributionsCloseRankingsOpenAt,
  rankingsCloseAt,
  contributionDescription,
  rankingDescription,
  attributes,
})
