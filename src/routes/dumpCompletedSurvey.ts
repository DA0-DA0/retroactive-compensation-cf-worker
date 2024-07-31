import { secp256k1PublicKeyToBech32Address } from '../crypto'
import {
  AuthorizedRequest,
  Contribution,
  Env,
  Rating,
  SurveyJson,
  SurveyStatus,
} from '../types'
import {
  getContributions,
  getRatings,
  getSurveyJson,
  isWalletMemberOfDaoAtBlockHeight,
  respond,
  respondError,
} from '../utils'

interface CompletedSurvey extends SurveyJson {
  contributions: Contribution[] | undefined
  ratings: Rating[] | undefined
}

export const dumpCompletedSurvey = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  // Get survey.
  const { survey } = request
  if (!survey) {
    return respondError(404, 'Survey not found.')
  }

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
      ? await getContributions(env, survey.id)
      : undefined,
    ratings: isMemberOfDaoAtSurveyBlockHeight
      ? await getRatings(
          env,
          request.parsedBody.data.auth.chainId,
          request.parsedBody.data.auth.chainBech32Prefix,
          survey
        )
      : undefined,
  }

  return respond(200, {
    survey: completedSurvey,
  })
}
