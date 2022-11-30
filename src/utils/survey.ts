import { Env, Survey, SurveyJson, SurveyRow, SurveyStatus } from '../types'

// Get status for survey.
export const statusForSurvey = (survey: SurveyRow) => {
  // If proposal ID set, survey is complete.
  if (survey.proposalId) {
    return SurveyStatus.Complete
  }

  // Otherwise, check dates.
  const contributionsOpenAt = new Date(survey.contributionsOpenAt)
  const contributionsCloseRatingsOpenAt = new Date(
    survey.contributionsCloseRatingsOpenAt
  )
  const ratingsCloseAt = new Date(survey.ratingsCloseAt)
  const now = new Date()

  const status =
    contributionsOpenAt > now
      ? SurveyStatus.Inactive
      : contributionsCloseRatingsOpenAt > now
      ? SurveyStatus.AcceptingContributions
      : ratingsCloseAt > now
      ? SurveyStatus.AcceptingRatings
      : SurveyStatus.Complete

  return status
}

export const surveyForRow = (survey: SurveyRow): Survey => ({
  ...survey,
  status: statusForSurvey(survey),
  attributes: JSON.parse(survey.attributesJson),
})

// The active survey has ratings not yet completed or has no proposalId, which
// means it is incomplete.
export const getActiveSurvey = async (
  env: Env,
  dao: string
): Promise<Survey | undefined> => {
  // Find active survey.
  const activeSurveyRow = await env.DB.prepare(
    "SELECT * FROM surveys WHERE dao = ?1 AND (ratingsCloseAt > DATETIME('now') AND proposalId IS NULL)"
  )
    .bind(dao)
    .first<SurveyRow | undefined>()

  return activeSurveyRow ? surveyForRow(activeSurveyRow) : undefined
}

export const getSurveyJson = ({
  status,
  name,
  contributionsOpenAt,
  contributionsCloseRatingsOpenAt,
  ratingsCloseAt,
  contributionInstructions,
  ratingInstructions,
  attributes,
}: Survey): SurveyJson => ({
  status,
  name,
  contributionsOpenAt,
  contributionsCloseRatingsOpenAt,
  ratingsCloseAt,
  contributionInstructions,
  ratingInstructions,
  attributes,
})
