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
  contributionsCloseRankingsOpenAt: string
  rankingsCloseAt: string
  contributionDescription: string
  rankingDescription: string
  attributes: Attribute[]
}

export const createSurvey = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Check for active survey.
  if (request.activeSurvey) {
    return respondError(400, 'There is already an active survey.')
  }

  const surveyRequest = request.parsedBody.data.survey as SurveyRequest
  if (
    // Verify survey matches expected structure.
    !objectMatchesStructure(surveyRequest, {
      name: {},
      contributionsOpenAt: {},
      contributionsCloseRankingsOpenAt: {},
      rankingsCloseAt: {},
      contributionDescription: {},
      rankingDescription: {},
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
    'INSERT INTO surveys (dao, name, contributionsOpenAt, contributionsCloseRankingsOpenAt, rankingsCloseAt, contributionDescription, rankingDescription, attributesJson, createdAtBlockHeight, createdAt, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) RETURNING *'
  )
    .bind(
      request.dao,
      surveyRequest.name,
      surveyRequest.contributionsOpenAt,
      surveyRequest.contributionsCloseRankingsOpenAt,
      surveyRequest.rankingsCloseAt,
      surveyRequest.contributionDescription,
      surveyRequest.rankingDescription,
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
    .first<SurveyRow>()

  const survey = getSurveyJson(surveyForRow(surveyRow))
  return respond(200, {
    survey,
  })
}
