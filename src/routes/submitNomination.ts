import { isValidPublicKey } from '../crypto'
import { AuthorizedRequest, Env, SurveyStatus } from '../types'
import { RATE_MAX, RATE_MIN, respond, respondError } from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SubmitNominationRequest {
  contributor: string
  contribution: string
  files?: string[] | null
  ratings?: (number | null)[]
}

export const submitNomination = async (
  request: AuthorizedRequest<SubmitNominationRequest>,
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
  // Ensure ratings (thus nominations) are being accepted.
  if (survey.status !== SurveyStatus.AcceptingRatings) {
    return respondError(400, 'Nominations are not being accepted.')
  }

  if (
    !objectMatchesStructure(data, {
      contributor: {},
      contribution: {},
    }) ||
    !data.contributor.trim() ||
    !data.contribution.trim()
  ) {
    return respondError(400, 'Missing contributor or contribution.')
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

  // Validate contributor public key.
  if (!isValidPublicKey(data.contributor)) {
    return respondError(400, 'Invalid contributor public key.')
  }

  // If contribution exists, only allow to be updated by the rater who initially
  // nominated them.
  const existingContribution = await env.DB.prepare(
    'SELECT * FROM contributions WHERE surveyId = ?1 AND contributorPublicKey = ?2'
  )
    .bind(survey.id, data.contributor)
    .first<{ nominatedByPublicKey: string | null } | undefined>()
  if (
    existingContribution &&
    existingContribution.nominatedByPublicKey !== data.auth.publicKey
  ) {
    return respondError(
      404,
      existingContribution.nominatedByPublicKey === null
        ? 'Contributor already submitted a contribution.'
        : 'Contributor already nominated by another rater, so you cannot update their contribution.'
    )
  }

  // Make contribution. Updates if already exists.
  await env.DB.prepare(
    'INSERT INTO contributions (surveyId, nominatedByPublicKey, contributorPublicKey, content, filesJson, ratingsJson, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7) ON CONFLICT(surveyId, contributorPublicKey) DO UPDATE SET content = ?4, filesJson = ?5, ratingsJson = ?6, updatedAt = ?7'
  )
    .bind(
      survey.id,
      data.auth.publicKey,
      data.contributor,
      data.contribution,
      data.files ? JSON.stringify(data.files) : null,
      data.ratings ? JSON.stringify(data.ratings) : null,
      new Date().toISOString()
    )
    .run()

  return respond(200, { success: true })
}
