import { createCors } from 'itty-cors'
import { Router } from 'itty-router'

import { Env } from './types'
import {
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  authDaoMemberMiddleware,
  authMiddleware,
} from './auth'
import { handleNonce } from './routes/nonce'
import { respondError } from './utils'
import { createSurvey } from './routes/createSurvey'
import { loadActiveSurveyForDao, loadDaoFromParams } from './middleware'
import { getSurvey } from './routes/getSurvey'
import { submitContribution } from './routes/submitContribution'
import { submitRankings } from './routes/submitRankings'
import { completeSurvey } from './routes/completeSurvey'
import { getContributions } from './routes/getContributions'
import { getRankings } from './routes/getRankings'
import { listClosedSurveys } from './routes/listClosedSurveys'
import { getClosedSurvey } from './routes/getClosedSurvey'

// Create CORS handlers.
const { preflight, corsify } = createCors({
  methods: ['GET', 'POST'],
  origins: ['*'],
  maxAge: 3600,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  },
})

const router = Router()

// Handle CORS preflight OPTIONS request.
router.options('*', preflight)

//! Unauthenticated routes.

// Get nonce for publicKey.
router.get('/nonce/:publicKey', handleNonce)

// Get survey info.
router.get(
  '/:dao/:wallet/status',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  getSurvey
)
// List closed surveys.
router.get('/:dao/list', loadDaoFromParams, listClosedSurveys)

//! Authenticated routes.
// Authenticate the following routes.
router.all('*', authMiddleware)

// Data storage routes.

// Create survey.
router.post(
  '/:dao',
  loadDaoFromParams,
  authDaoMemberMiddleware,
  loadActiveSurveyForDao,
  createSurvey
)
// Submit contribution.
router.post(
  '/:dao/contribution',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  submitContribution
)
// Submit rankings.
router.post(
  '/:dao/rank',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  submitRankings
)
// Complete survey.
router.post(
  '/:dao/complete',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  completeSurvey
)

// Data retrieval routes.

// Get contributions.
router.post(
  '/:dao/contributions',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  getContributions
)
// Get rankings.
router.post(
  '/:dao/rankings',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  getRankings
)
// Get closed survey. Authenticates manually.
router.post('/:dao/view/:surveyId', loadDaoFromParams, getClosedSurvey)

//! 404
router.all('*', () => respondError(404, 'Not found'))

//! Entrypoint.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router
      .handle(request, env)
      .catch((err) => {
        console.error('Error handling request', request.url, err)
        return respondError(
          500,
          `Internal server error. ${
            err instanceof Error ? err.message : `${JSON.stringify(err)}`
          }`
        )
      })
      .then(corsify)
  },
}
