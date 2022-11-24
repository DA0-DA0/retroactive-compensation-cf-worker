# Design spec

Author: [@NoahSaso](https://github.com/NoahSaso)

## Goal

Build an interface that replaces the current DF retroactive compensation system powered by Google Forms and Qualtrics, utilizing wallet login.

## Infrastructure

This will be built using [Cloudflare Workers](https://workers.cloudflare.com/) and [Cloudflare D1](https://developers.cloudflare.com/d1/) for relational DB storage.

## Functionality

It should:

- allow any DAO member to create a survey if one is not already active, specifying:
  - a label for the survey
  - the date contributions will start being accepted
  - the date contributions will stop being accepted, and ratings start being accepted
  - the date ratings will stop being accepted
  - the attributes that can be rated for each contributor, and the tokens distributed according to each attribute
    - (e.g. we may want to rate "financial value produced" separately from "community value produced", and reward financial compensation and voting power compensation differently)
  - a markdown-formatted description that will be displayed to contributors while submitting
  - a markdown-formatted description that will be displayed to DF members while rating
- allow anyone to submit their contributions to the currently active survey, while contributions are being accepted
- allow any DAO member to view contribution submissions, while ratings are being accepted
- allow any DAO member to submit ratings for each contributor that submitted, while ratings are being accepted
- allow any DAO member to view ratings for the active survey, once they have submitted their ratings OR once ratings stop being accepted
- allow any DAO member to record the proposal ID of the created proposal, setting the status to complete, once ratings stop being accepted
- allow any DAO member to view contributions and ratings from past surveys

## Routes

For brevity, wallet authentication information is omitted in the request bodies below. This template will be used to implement wallet auth: https://github.com/NoahSaso/cloudflare-worker-cosmos-auth

### `POST /:dao`

Create a survey for the DAO, if one is not already active (active determined by the `ratingsCloseAt` date being in the future).

#### Request

```ts
{
  survey: {
    name: string
    contributionsOpenAt: string
    contributionsCloseRatingsOpenAt: string
    ratingsCloseAt: string
    contributionInstructions: string
    ratingInstructions: string
    attributes: {
      name: string
      nativeTokens: {
        denom: string
        amount: string
      }
      ;[]
      cw20Tokens: {
        address: string
        amount: string
      }
      ;[]
    }
    ;[]
  }
}
```

### `GET /:dao/:wallet/status`

Retrieve the survey for this DAO, and provide specific context for a wallet.

#### Response

```ts
{
  survey: {
    id: number
    status: 'inactive' |
      'accepting_contributions' |
      'accepting_ratings' |
      'awaiting_completion' |
      'complete'
    name: string
    contributionsOpenAt: string
    contributionsCloseRatingsOpenAt: string
    ratingsCloseAt: string
    contributionInstructions: string
    ratingInstructions: string
    attributes: {
      name: string
      nativeTokens: {
        denom: string
        amount: string
      }
      ;[]
      cw20Tokens: {
        address: string
        amount: string
      }
      ;[]
    }
    ;[]
  }
  contribution: string | null
  rated: boolean
}
```

### `POST /:dao/contribution`

Submit a contribution to the active survey. Anyone can do this while contributions are being accepted.

#### Request

```ts
{
  contribution: string
}
```

### `POST /:dao/rate`

Submit ratings to the active survey. Any DAO member can do this while ratings are being accepted.

#### Request

```ts
{
  ratings: {
    contributionId: number
    // The position matches the position in the survey's attributes list.
    attributes: (number | null)[]
  }[]
}
```

### `POST /:dao/contributions`

Fetch contributions for the active survey and this wallet's ratings if submitted already. Any DAO member can do this.

#### Response

```ts
{
  contributions: {
    id: number
    contributor: string
    content: string
    createdAt: string
    updatedAt: string
  }[]
  ratings: {
    contributionId: number
    // The position matches the position in the survey's attributes list.
    attributes: (number | null)[]
  }[]
}
```

### `POST /:dao/ratings`

Fetch contributions and ratings for the active survey. Any DAO member can do this after the rating period closes.

#### Response

```ts
{
  contributions: {
    id: number
    contributor: string
    content: string
    createdAt: string
    updatedAt: string
  }[]
  ratings: {
    rater: string
    contributions: {
      id: number
      // The position matches the position in the survey's attributes list.
      attributes: (number | null)[]
    }[]
  }[]
}
```

### `POST /:dao/complete`

Set the active survey to completed and store the proposal ID for the created proposal. Any DAO member can do this once ratings stop being accepted.

#### Response

```ts
{
  proposalId: string
}
```

### `GET /:dao/list`

List completed surveys. Anyone can do this.

#### Response

```ts
{
  surveys: {
    id: number
    name: string
    contributionCount: number
    openedAt: string
  }
  ;[]
}
```

### `POST /:dao/view/:surveyId`

View specific info for a completed survey. Any DAO member can do this.

#### Response

```ts
{
  survey: {
    id: number
    name: string
    contributionsOpenAt: string
    contributionsCloseRatingsOpenAt: string
    ratingsCloseAt: string
    proposalId: string
    attributes: {
      name: string
      nativeTokens: {
        denom: string
        amount: string
      }[]
      cw20Tokens: {
        address: string
        amount: string
      }[]
    }[]
    // Only present for DAO members.
    contributions: {
      id: number
      contributor: string
      content: string
      createdAt: string
      updatedAt: string
    }[] | undefined
    // Only present for DAO members.
    ratings: {
      rater: string
      contributions: {
        contributor: string
        content: string
        // The position matches the position in the survey's attributes list.
        attributes: (number | null)[]
      }[]
    }[] | undefined
  }
}
```

## Database Tables

### Survey

hasMany Contribution
hasMany Rating

```ts
{
  id: number
  dao: string
  name: string
  contributionsOpenAt: Date
  contributionsCloseRatingsOpenAt: Date
  ratingsCloseAt: Date
  contributionInstructions: string
  ratingInstructions: string
  attributesJson: string
  proposalId: string | NULL
}
```

### Contribution

hasOne Survey

```ts
{
  id: number
  survey: Survey
  contributorPublicKey: string
  content: string
}
```

### Rating

hasOne Survey
hasOne Contribution

```ts
{
  id: number
  survey: Survey
  contribution: Contribution
  attributeIndex: number
  raterPublicKey: string
  value: number
}
```
