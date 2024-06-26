import { secp256k1PublicKeyToBech32Address } from '../crypto'
import {
  AuthorizedRequest,
  Contribution,
  Env,
  Rating,
  SurveyJson,
  SurveyRow,
  SurveyStatus,
} from '../types'
import {
  getContributions,
  getRatings,
  getSurveyJson,
  isWalletMemberOfDaoAtBlockHeight,
  respond,
  respondError,
  surveyForRow,
} from '../utils'

interface CompletedSurvey extends SurveyJson {
  contributions: Contribution[] | undefined
  ratings: Rating[] | undefined
}

export const getCompletedSurvey = async (
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

  // Ensure survey is completed.
  if (
    survey.status !== SurveyStatus.AwaitingCompletion &&
    survey.status !== SurveyStatus.Complete
  ) {
    return respondError(400, 'Survey is not completed.')
  }

  const completedSurvey: CompletedSurvey = {
    ...getSurveyJson(survey),
    contributions: isMemberOfDaoAtSurveyBlockHeight
      ? await getContributions(env, surveyId)
      : undefined,
    ratings: isMemberOfDaoAtSurveyBlockHeight
      ? await getRatings(
          env,
          request.parsedBody.data.auth.chainId,
          request.parsedBody.data.auth.chainBech32Prefix,
          surveyRow
        )
      : undefined,
  }

  return respond(200, {
    survey: completedSurvey,
  })
}
