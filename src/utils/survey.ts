import {
  Env,
  Survey,
  SurveyJson,
  SurveyRow,
  SurveyStatus,
  SurveyWithMetadata,
} from '../types'

// Get status for survey.
export const statusForSurvey = (survey: SurveyRow): SurveyStatus => {
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
      : SurveyStatus.AwaitingCompletion

  return status
}

export const surveyForRow = (survey: SurveyRow): Survey => ({
  ...survey,
  status: statusForSurvey(survey),
  attributes: JSON.parse(survey.attributesJson),
  contributionCount: survey.contributionCount,
})

/**
 * Get a survey for this DAO by UUID.
 */
export const getSurvey = async (
  env: Env,
  dao: string,
  uuid: string
): Promise<Survey | undefined> => {
  const surveyRow = await env.DB.prepare(
    `SELECT *, (SELECT COUNT(*) FROM contributions WHERE contributions.surveyId = id) as contributionCount FROM surveys WHERE dao = ?1 AND uuid = ?2`
  )
    .bind(dao, uuid)
    .first<SurveyRow | undefined>()

  return surveyRow ? surveyForRow(surveyRow) : undefined
}

export const getSurveyJson = ({
  uuid,
  status,
  name,
  contributionsOpenAt,
  contributionsCloseRatingsOpenAt,
  ratingsCloseAt,
  contributionInstructions,
  ratingInstructions,
  attributes,
  proposalId,
  createdAtBlockHeight,
  contributionCount,
}: Survey): SurveyJson => ({
  uuid,
  status,
  name,
  contributionsOpenAt,
  contributionsCloseRatingsOpenAt,
  ratingsCloseAt,
  contributionInstructions,
  ratingInstructions,
  attributes,
  proposalId,
  createdAtBlockHeight,
  contributionCount,
})

export const getSurveyWithMetadata = async (
  env: Env,
  survey: Survey,
  contributorPublicKey: string
): Promise<SurveyWithMetadata> => {
  // Get user contribution if exists.
  const contribution = await env.DB.prepare(
    'SELECT content, filesJson, ratingsJson FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
  )
    .bind(survey.id, contributorPublicKey)
    .first<
      | {
          content: string
          filesJson: string | null
          ratingsJson: string | null
        }
      | undefined
    >()

  // Check if user submitted rating.
  const walletRatingCount = await env.DB.prepare(
    'SELECT COUNT(*) FROM ratings WHERE surveyId = ?1 AND raterPublicKey = ?2'
  )
    .bind(survey.id, contributorPublicKey)
    .first<number>('COUNT(*)')

  const rated = typeof walletRatingCount === 'number' && walletRatingCount > 0

  return {
    survey: getSurveyJson(survey),
    contribution: contribution?.content
      ? {
          content: contribution.content,
          files: contribution.filesJson
            ? JSON.parse(contribution.filesJson)
            : null,
          selfRatings: contribution.ratingsJson
            ? JSON.parse(contribution.ratingsJson)
            : null,
        }
      : null,
    rated,
  }
}
