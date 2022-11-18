import { secp256k1PublicKeyToBech32Address } from '../crypto'
import {
  AuthorizedRequest,
  Contribution,
  Env,
  Ranking,
  SurveyJson,
  SurveyRow,
  SurveyStatus,
} from '../types'
import {
  getContributions,
  getRankings,
  getSurveyJson,
  isWalletMemberOfDaoAtBlockHeight,
  respond,
  respondError,
  surveyForRow,
} from '../utils'

interface ClosedSurvey extends SurveyJson {
  contributions: Contribution[] | undefined
  rankings: Ranking[] | undefined
}

export const getClosedSurvey = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  const surveyIdString = request.params?.surveyId
  const surveyId = parseInt(surveyIdString ?? '', 10)
  if (!surveyIdString || isNaN(surveyId)) {
    return respondError(400, 'Missing surveyId.')
  }

  const surveyRow = await env.DB.prepare(
    'SELECT * FROM surveys WHERE surveyId = ?1'
  )
    .bind(surveyId)
    .first<SurveyRow | undefined>()
  if (!surveyRow) {
    return respondError(404, 'Survey not found.')
  }

  const survey = surveyForRow(surveyRow)

  // Ensure requesting wallet is member of DAO at the survey's creation block
  // height.
  const address = secp256k1PublicKeyToBech32Address(
    request.parsedBody.data.auth.publicKey,
    request.parsedBody.data.auth.chainBech32Prefix
  )
  const isMemberOfDaoAtSurveyBlockHeight =
    await isWalletMemberOfDaoAtBlockHeight(
      request.parsedBody.data.auth.chainId,
      request.dao,
      address,
      survey.createdAtBlockHeight
    )

  // Ensure survey is closed.
  if (
    survey.status !== SurveyStatus.AwaitingCompletion &&
    survey.status !== SurveyStatus.Complete
  ) {
    return respondError(400, 'Survey is not closed.')
  }

  const closedSurvey: ClosedSurvey = {
    ...getSurveyJson(survey),
    contributions: isMemberOfDaoAtSurveyBlockHeight
      ? await getContributions(env, surveyId)
      : undefined,
    rankings: isMemberOfDaoAtSurveyBlockHeight
      ? await getRankings(env, surveyId)
      : undefined,
  }

  return respond(200, {
    survey: closedSurvey,
  })
}
