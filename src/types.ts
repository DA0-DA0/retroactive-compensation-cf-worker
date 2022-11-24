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

export interface AuthorizedRequest<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, any> = Record<string, any>
> extends IttyRequest {
  parsedBody: RequestBody<Data>
  dao: string
  activeSurvey: Survey | undefined
}

export interface SurveyRow {
  surveyId: number
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
  createdAt: string
  updatedAt: string
}

export interface Survey extends SurveyRow {
  status: string
  attributes: Attribute[]
}

export type SurveyJson = Pick<
  Survey,
  | 'status'
  | 'name'
  | 'contributionsOpenAt'
  | 'contributionsCloseRatingsOpenAt'
  | 'ratingsCloseAt'
  | 'contributionInstructions'
  | 'ratingInstructions'
  | 'attributes'
>

export enum SurveyStatus {
  Inactive = 'inactive',
  AcceptingContributions = 'accepting_contributions',
  AcceptingRatings = 'accepting_ratings',
  AwaitingCompletion = 'awaiting_completion',
  Complete = 'complete',
}

export interface Attribute {
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

export interface ContributionRow {
  contributionId: number
  contributorPublicKey: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface Contribution {
  id: number
  contributor: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface RatingRow {
  contributionId: number
  attributeIndex: number
  raterPublicKey: string
  rating: number | null
}

export interface Rating {
  rater: string
  contributions: {
    id: number
    attributes: (number | null)[]
  }[]
}
