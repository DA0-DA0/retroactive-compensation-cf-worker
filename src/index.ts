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
import { getStatus } from './routes/getStatus'
import { submitContribution } from './routes/submitContribution'
import { submitRatings } from './routes/submitRatings'
import { completeSurvey } from './routes/completeSurvey'
import { getContributions } from './routes/getContributions'
import { getRatings } from './routes/getRatings'
import { listCompletedSurveys } from './routes/listCompletedSurveys'
import { getCompletedSurvey } from './routes/getCompletedSurvey'
import { submitNomination } from './routes/submitNomination'

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

// Handle CORS preflight.
router.all('*', preflight)

//! Unauthenticated routes.

// Get nonce for publicKey.
router.get('/nonce/:publicKey', handleNonce)

// Get survey status for wallet.
router.get(
  '/:dao/:wallet/status',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  getStatus
)
// List completed surveys.
router.get('/:dao/list', loadDaoFromParams, listCompletedSurveys)

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
// Nominate contribution.
router.post(
  '/:dao/nominate',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  submitNomination
)
// Submit ratings.
router.post(
  '/:dao/rate',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  submitRatings
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
// Get ratings.
router.post(
  '/:dao/ratings',
  loadDaoFromParams,
  loadActiveSurveyForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  getRatings
)
// Get completed survey. Authenticates manually.
router.post('/:dao/view/:surveyId', loadDaoFromParams, getCompletedSurvey)

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
