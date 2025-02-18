import { Attribute, AuthorizedRequest, Env, SurveyRow } from '../types'
import {
  getCosmWasmClientForChain,
  getSurveyJson,
  respond,
  respondError,
  surveyForRow,
} from '../utils'
import { objectMatchesStructure } from '../utils/objectMatchesStructure'

interface SurveyRequest {
  name: string
  contributionsOpenAt: string
  contributionsCloseRatingsOpenAt: string
  ratingsCloseAt: string
  contributionInstructions: string
  ratingInstructions: string
  attributes: Attribute[]
}

export const createSurvey = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  const surveyRequest = request.parsedBody.data.survey as SurveyRequest
  if (
    // Verify survey matches expected structure.
    !objectMatchesStructure(surveyRequest, {
      name: {},
      contributionsOpenAt: {},
      contributionsCloseRatingsOpenAt: {},
      ratingsCloseAt: {},
      contributionInstructions: {},
      ratingInstructions: {},
      attributes: {},
    }) ||
    !Array.isArray(surveyRequest.attributes) ||
    // Verify all attributes match expected structure.
    surveyRequest.attributes.some(
      (attribute) =>
        // Verify attribute matches expected structure.
        !objectMatchesStructure(attribute, {
          name: {},
          nativeTokens: {},
          cw20Tokens: {},
        }) || // Verify native tokens match expected structure.
        !Array.isArray(attribute.nativeTokens) ||
        attribute.nativeTokens.some(
          (token) =>
            !objectMatchesStructure(token, {
              denom: {},
              amount: {},
            })
        ) || // Verify cw20 tokens match expected structure.
        !Array.isArray(attribute.cw20Tokens) ||
        attribute.cw20Tokens.some(
          (token) =>
            !objectMatchesStructure(token, {
              address: {},
              amount: {},
            })
        )
    )
  ) {
    return respondError(400, 'Invalid survey.')
  }

  // Get block height.
  const currentBlockHeight = await (
    await getCosmWasmClientForChain(request.parsedBody.data.auth.chainId)
  ).getHeight()

  // Make survey.
  const timestamp = new Date().toISOString()
  const surveyRow = await env.DB.prepare(
    'INSERT INTO surveys (uuid, dao, creatorPublicKey, name, contributionsOpenAt, contributionsCloseRatingsOpenAt, ratingsCloseAt, contributionInstructions, ratingInstructions, attributesJson, createdAtBlockHeight, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13) RETURNING *'
  )
    .bind(
      crypto.randomUUID(),
      request.dao,
      request.parsedBody.data.auth.publicKey,
      surveyRequest.name,
      surveyRequest.contributionsOpenAt,
      surveyRequest.contributionsCloseRatingsOpenAt,
      surveyRequest.ratingsCloseAt,
      surveyRequest.contributionInstructions,
      surveyRequest.ratingInstructions,
      JSON.stringify(
        // Explicitly copy over attributes to remove any extra properties.
        surveyRequest.attributes.map(({ name, nativeTokens, cw20Tokens }) => ({
          name,
          nativeTokens: nativeTokens.map(({ denom, amount }) => ({
            denom,
            amount,
          })),
          cw20Tokens: cw20Tokens.map(({ address, amount }) => ({
            address,
            amount,
          })),
        }))
      ),
      currentBlockHeight,
      timestamp,
      timestamp
    )
    .first<Omit<SurveyRow, 'contributionCount'>>()

  if (!surveyRow) {
    return respondError(500, 'Failed to create survey.')
  }

  const survey = getSurveyJson(
    surveyForRow({
      ...surveyRow,
      contributionCount: 0,
    })
  )

  return respond(200, {
    survey,
  })
}
