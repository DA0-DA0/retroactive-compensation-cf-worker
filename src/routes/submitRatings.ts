import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SubmitRatingsRequest {
  ratings: {
    contributionId: number
    attributes: (number | null)[]
  }[]
}

const RATE_MIN = 0
const RATE_MAX = 100

export const submitRatings = async (
  request: AuthorizedRequest<SubmitRatingsRequest>,
  env: Env
): Promise<Response> => {
  const {
    activeSurvey,
    parsedBody: { data },
  } = request
  // Get active survey.
  if (!activeSurvey) {
    return respondError(400, 'There is no active survey.')
  }
  // Ensure ratings are being accepted.
  if (activeSurvey.status !== SurveyStatus.AcceptingRatings) {
    return respondError(400, 'Ratings are not being accepted.')
  }

  // Count contributions.
  const contributionCount = await env.DB.prepare(
    'SELECT COUNT(*) FROM contributions WHERE surveyId = ?1'
  )
    .bind(activeSurvey.surveyId)
    .first<number>('COUNT(*)')

  // Validate request.
  if (
    !objectMatchesStructure(data, { ratings: {} }) ||
    !Array.isArray(data.ratings) ||
    // Ensure a rating is provided for each contribution.
    data.ratings.length !== contributionCount ||
    data.ratings.some(
      (rating) =>
        !objectMatchesStructure(rating, {
          contributionId: {},
          attributes: {},
        }) ||
        !Array.isArray(rating.attributes) ||
        // Ensure a rating is provided for each attribute.
        rating.attributes.length !== activeSurvey.attributes.length ||
        // Ensure ratings are null (abstain) or valid numbers.
        rating.attributes.some(
          (rating) =>
            // If rating is null, it's valid.
            rating !== null &&
            // Ensure rating is a valid number if not null.
            (typeof rating !== 'number' ||
              !Number.isInteger(rating) ||
              rating < RATE_MIN ||
              rating > RATE_MAX)
        )
    )
  ) {
    return respondError(400, 'Invalid ratings.')
  }

  // Make ratings. Updates if already exists.
  const timestamp = new Date().toISOString()
  await env.DB.batch(
    data.ratings.flatMap(({ contributionId, attributes }) =>
      attributes.map((rating, attributeIndex) =>
        env.DB.prepare(
          'INSERT INTO ratings (surveyId, contributionId, attributeIndex, raterPublicKey, rating, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(surveyId, contributionId, attributeIndex, raterPublicKey) DO UPDATE SET rating = ?5, updatedAt = ?7'
        ).bind(
          activeSurvey.surveyId,
          contributionId,
          attributeIndex,
          data.auth.publicKey,
          rating,
          timestamp,
          timestamp
        )
      )
    )
  )

  return respond(200, { success: true })
}