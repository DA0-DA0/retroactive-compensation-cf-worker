import { Request as IttyRequest } from 'itty-router'

export interface Env {
  NONCES: KVNamespace
  DB: D1Database
}

export interface Auth {
  type: string
  nonce: number
  chainId: string
  chainFeeDenom: string
  chainBech32Prefix: string
  publicKey: string
}

export type RequestBody<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, unknown> = Record<string, any>
> = {
  data: {
    auth: Auth
  } & Data
  signature: string
}

export type AuthorizedRequest<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, any> = Record<string, any>
> = IttyRequest & {
  parsedBody: RequestBody<Data>
  dao: string
  uuid: string | undefined
  survey: Survey | undefined
}

export type SurveyRow = {
  id: number
  uuid: string
  dao: string
  name: string
  contributionsOpenAt: string
  contributionsCloseRatingsOpenAt: string
  ratingsCloseAt: string
  contributionInstructions: string
  ratingInstructions: string
  attributesJson: string
  proposalId: string | null
  createdAtBlockHeight: number
  contributionCount: number
  createdAt: string
  updatedAt: string
}

export type Survey = SurveyRow & {
  status: SurveyStatus
  attributes: Attribute[]
  contributionCount: number
}

export type SurveyJson = Pick<
  Survey,
  | 'uuid'
  | 'status'
  | 'name'
  | 'contributionsOpenAt'
  | 'contributionsCloseRatingsOpenAt'
  | 'ratingsCloseAt'
  | 'contributionInstructions'
  | 'ratingInstructions'
  | 'attributes'
  | 'proposalId'
  | 'createdAtBlockHeight'
  | 'contributionCount'
>

export enum SurveyStatus {
  Inactive = 'inactive',
  AcceptingContributions = 'accepting_contributions',
  AcceptingRatings = 'accepting_ratings',
  AwaitingCompletion = 'awaiting_completion',
  Complete = 'complete',
}

export type Attribute = {
  name: string
  nativeTokens: {
    denom: string
    amount: string
  }[]
  cw20Tokens: {
    address: string
    amount: string
  }[]
}

export type Contribution = {
  id: number
  nominatedBy: string | null
  contributor: string
  content: string
  files: ContributionFile[] | null
  ratings: (number | null)[] | null
  createdAt: string
  updatedAt: string
}

export type RatingRow = {
  contributionId: number
  attributeIndex: number
  raterPublicKey: string
  rating: number | null
}

export type Rating = {
  rater: string
  raterVotingPower: string
  contributions: {
    id: number
    attributes: (number | null)[]
  }[]
}

export type ContributionFile = {
  name: string
  url: string
  mimetype: string
}

/**
 * Survey with extra metadata about the requesting user's relationship to the
 * survey.
 */
export type SurveyWithMetadata = {
  survey: SurveyJson
  contribution: {
    content: string
    files: ContributionFile[] | null
    selfRatings: (number | null)[] | null
  } | null
  rated: boolean
}
