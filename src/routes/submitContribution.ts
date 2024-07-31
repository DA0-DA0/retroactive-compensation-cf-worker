import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { RATE_MAX, RATE_MIN, respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SubmitContributionRequest {
  contribution: string
  files?: string[] | null
  ratings?: (number | null)[]
}

export const submitContribution = async (
  request: AuthorizedRequest<SubmitContributionRequest>,
  env: Env
): Promise<Response> => {
  const {
    survey,
    parsedBody: { data },
  } = request
  // Get survey.
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }
  // Ensure contributions are being accepted.
  if (survey.status !== SurveyStatus.AcceptingContributions) {
    return respondError(400, 'Contributions are not being accepted.')
  }

  if (
    !objectMatchesStructure(data, { contribution: {} }) ||
    !data.contribution.trim()
  ) {
    return respondError(400, 'Missing contribution.')
  }

  if (
    // Validate ratings if provided.
    data.ratings &&
    // Ensure ratings is an array.
    (!Array.isArray(data.ratings) ||
      // Ensure a rating is provided for each attribute.
      data.ratings.length !== survey.attributes.length ||
      // Ensure ratings are null (abstain) or valid numbers.
      data.ratings.some(
        (rating) =>
          // If rating is null, it's valid.
          rating !== null &&
          // Ensure rating is a valid number if not null.
          (typeof rating !== 'number' ||
            !Number.isInteger(rating) ||
            rating < RATE_MIN ||
            rating > RATE_MAX)
      ))
  ) {
    return respondError(400, 'Invalid ratings.')
  }

  if (
    // Validate files if provided.
    data.files &&
    // Ensure files is an array.
    (!Array.isArray(data.files) ||
      !data.files.every((f) =>
        objectMatchesStructure(f, {
          name: {},
          url: {},
          mimetype: {},
        })
      ))
  ) {
    return respondError(400, 'Invalid files.')
  }

  // Make contribution. Updates if already exists.
  const timestamp = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO contributions (surveyId, contributorPublicKey, content, filesJson, ratingsJson, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(surveyId, contributorPublicKey) DO UPDATE SET content = ?3, filesJson = ?4, ratingsJson = ?5, updatedAt = ?6'
  )
    .bind(
      survey.id,
      data.auth.publicKey,
      data.contribution,
      data.files ? JSON.stringify(data.files) : null,
      data.ratings ? JSON.stringify(data.ratings) : null,
      timestamp
    )
    .run()

  return respond(200, { success: true })
}
