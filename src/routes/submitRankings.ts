import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SubmitRankingsRequest {
  rankings: {
    contributionId: number
    attributes: (number | null)[]
  }[]
}

const RANK_MIN = 0
const RANK_MAX = 100

export const submitRankings = async (
  request: AuthorizedRequest<SubmitRankingsRequest>,
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
  // Ensure rankings are being accepted.
  if (activeSurvey.status !== SurveyStatus.AcceptingRankings) {
    return respondError(400, 'Rankings are not being accepted.')
  }

  // Count contributions.
  const contributionCount = await env.DB.prepare(
    'SELECT COUNT(*) FROM contributions WHERE surveyId = ?1'
  )
    .bind(activeSurvey.surveyId)
    .first<number>('COUNT(*)')

  // Validate request.
  if (
    !objectMatchesStructure(data, { rankings: {} }) ||
    !Array.isArray(data.rankings) ||
    // Ensure a ranking is provided for each contribution.
    data.rankings.length !== contributionCount ||
    data.rankings.some(
      (ranking) =>
        !objectMatchesStructure(ranking, {
          contributionId: {},
          attributes: {},
        }) ||
        !Array.isArray(ranking.attributes) ||
        // Ensure a ranking is provided for each attribute.
        ranking.attributes.length !== activeSurvey.attributes.length ||
        // Ensure rankings are null (abstain) or valid numbers.
        ranking.attributes.some(
          (ranking) =>
            // If ranking is null, it's valid.
            ranking !== null &&
            // Ensure ranking is a valid number if not null.
            (typeof ranking !== 'number' ||
              !Number.isInteger(ranking) ||
              ranking < RANK_MIN ||
              ranking > RANK_MAX)
        )
    )
  ) {
    return respondError(400, 'Invalid rankings.')
  }

  // Make rankings. Updates if already exists.
  const timestamp = new Date().toISOString()
  await env.DB.batch(
    data.rankings.flatMap(({ contributionId, attributes }) =>
      attributes.map((ranking, attributeIndex) =>
        env.DB.prepare(
          'INSERT INTO rankings (surveyId, contributionId, attributeIndex, rankerPublicKey, ranking, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(surveyId, contributionId, attributeIndex, rankerPublicKey) DO UPDATE SET ranking = ?5, updatedAt = ?7'
        ).bind(
          activeSurvey.surveyId,
          contributionId,
          attributeIndex,
          data.auth.publicKey,
          ranking,
          timestamp,
          timestamp
        )
      )
    )
  )

  return respond(200, { success: true })
}
