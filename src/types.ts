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
  contributionsCloseRankingsOpenAt: string
  rankingsCloseAt: string
  contributionDescription: string
  rankingDescription: string
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
  | 'contributionsCloseRankingsOpenAt'
  | 'rankingsCloseAt'
  | 'contributionDescription'
  | 'rankingDescription'
  | 'attributes'
>

export enum SurveyStatus {
  Inactive = 'inactive',
  AcceptingContributions = 'accepting_contributions',
  AcceptingRankings = 'accepting_rankings',
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

export interface RankingRow {
  contributionId: number
  attributeIndex: number
  rankerPublicKey: string
  ranking: number | null
}

export interface Ranking {
  ranker: string
  contributions: {
    id: number
    attributes: (number | null)[]
  }[]
}
