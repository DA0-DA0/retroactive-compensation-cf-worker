# Initial design spec

Author: [@NoahSaso](https://github.com/NoahSaso)

## Goal

Build an interface that replaces the current DF retroactive compensation system powered by Google Forms and Qualtrics, utilizing wallet login.

## Infrastructure

This will be built using [Cloudflare Workers](https://workers.cloudflare.com/) and [Cloudflare D1](https://developers.cloudflare.com/d1/) for relational DB storage.

## Functionality

It should:

- allow any DAO member to create a survey if one is not already active, specifying:
  - a label for the survey
  - the date submissions will start being accepted
  - the date submissions will stop being accepted, and rankings start being accepted
  - the date rankings will stop being accepted
  - the attributes that can be ranked for each contributor, and the tokens distributed according to each attribute
    - (e.g. we may want to rank "financial value produced" separately from "community value produced", and reward financial compensation and voting power compensation differently)
  - a markdown-formatted description that will be displayed to contributors while submitting
  - a markdown-formatted description that will be displayed to DF members while ranking
- allow anyone to submit their contributions to the currently active survey, while submissions are being accepted
- allow any DAO member to view contribution submissions, while rankings are being accepted
- allow any DAO member to submit rankings for each contributor that submitted, while rankings are being accepted
- allow any DAO member to view rankings for the active survey, once they have submitted their rankings OR once rankings stop being accepted
- allow any DAO member to record the proposal ID of the created proposal, setting the status to complete, once rankings stop being accepted
- allow any DAO member to view contributions and rankings from past surveys

## Routes

For brevity, wallet authentication information is omitted in the request bodies below. This template will be used to implement wallet auth: https://github.com/NoahSaso/cloudflare-worker-cosmos-auth

### `POST /:dao`

Create a survey for the DAO, if one is not already active (active determined by the `rankingsCloseAt` date being in the future).

#### Request

```ts
{
  survey: {
    name: string
    submissionsOpenAt: string
    submissionsCloseRankingsOpenAt: string
    rankingsCloseAt: string
    submissionDescription: string
    rankingDescription: string
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
    status: 'inactive' |
      'accepting_submissions' |
      'accepting_rankings' |
      'awaiting_completion' |
      'complete'
    name: string
    submissionsOpenAt: string
    submissionsCloseRankingsOpenAt: string
    rankingsCloseAt: string
    submissionDescription: string
    rankingDescription: string
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
  contributed: boolean
  ranked: boolean
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

### `POST /:dao/rank`

Submit rankings to the active survey. Any DAO member can do this while rankings are being accepted.

#### Request

```ts
{
	rankings: {
		contributionId: number
		// The position matches the position in the survey's attributes list.
		attributes: (number | null)[]
	}[]
}
```

### `POST /:dao/contributions`

Fetch contributions for the active survey. Any DAO member can do this.

#### Response

```ts
{
  contributions: {
    id: number
    contributor: string
    content: string
    createdAt: string
    updatedAt: string
  }
  ;[]
}
```

### `POST /:dao/rankings`

Fetch contributions and rankings for the active survey. Any DAO member can do this after the ranking period closes.

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
	rankings: {
		ranker: string
		contributions: {
			contributor: string
			content: string
			// The position matches the position in the survey's attributes list.
			attributes: (number | null)[]
		}[]
	}[]
}
```

### `POST /:dao/complete`

Set the active survey to completed and store the proposal ID for the created proposal. Any DAO member can do this once rankings stop being accepted.

#### Response

```ts
{
  proposalId: string
}
```

### `POST /:dao/list`

List past surveys. Anyone can do this.

#### Response

```ts
{
  surveys: {
    id: number
    name: string
    contributionCount: number
  }
  ;[]
}
```

### `POST /:dao/view/:surveyId`

View specific info for a past survey. Any DAO member can do this.

#### Response

```ts
{
	survey: {
		name: string
		submissionsOpenAt: string
		submissionsCloseRankingsOpenAt: string
		rankingsCloseAt: string
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
		rankings: {
			ranker: string
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
hasMany Ranking

```ts
{
  id: number
  dao: string
  name: string
  submissionsOpenAt: Date
  submissionsCloseRankingsOpenAt: Date
  rankingsCloseAt: Date
  submissionDescription: string
  rankingDescription: string
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

### Ranking

hasOne Survey
hasOne Contribution

```ts
{
  id: number
  survey: Survey
  contribution: Contribution
  attributeIndex: number
  rankerPublicKey: string
  value: number
}
```
