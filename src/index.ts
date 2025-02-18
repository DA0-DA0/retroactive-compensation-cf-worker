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
import { loadSurveyByUuidForDao, loadDaoFromParams } from './middleware'
import { getStatus } from './routes/getStatus'
import { submitContribution } from './routes/submitContribution'
import { submitRatings } from './routes/submitRatings'
import { completeSurvey } from './routes/completeSurvey'
import { getContributions } from './routes/getContributions'
import { getRatings } from './routes/getRatings'
import { dumpCompletedSurvey } from './routes/dumpCompletedSurvey'
import { submitNomination } from './routes/submitNomination'
import { listSurveys } from './routes/listSurveys'
import { deleteSurvey } from './routes/deleteSurvey'

// Create CORS handlers.
const { preflight, corsify } = createCors({
  methods: ['GET', 'POST', 'DELETE'],
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
  '/:dao/:uuid/:wallet/status',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  getStatus
)

// List survey statuses for wallet.
router.get('/:dao/:wallet/list', loadDaoFromParams, listSurveys)

//! Authenticated routes.
// Authenticate the following routes.
router.all('*', authMiddleware)

// Data storage routes.

// Create survey.
router.post(
  '/:dao/survey',
  loadDaoFromParams,
  authDaoMemberMiddleware,
  createSurvey
)

// Delete survey.
router.delete(
  '/:dao/:uuid',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  deleteSurvey
)

// Submit contribution.
router.post(
  '/:dao/:uuid/contribution',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  submitContribution
)

// Nominate contribution.
router.post(
  '/:dao/:uuid/nominate',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  submitNomination
)

// Submit ratings.
router.post(
  '/:dao/:uuid/rate',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  submitRatings
)

// Complete survey.
router.post(
  '/:dao/:uuid/complete',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  completeSurvey
)

// Data retrieval routes.

// Get contributions.
router.post(
  '/:dao/:uuid/contributions',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  getContributions
)

// Get ratings.
router.post(
  '/:dao/:uuid/ratings',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  authDaoMemberAtSurveyCreationBlockHeightMiddleware,
  getRatings
)

// Get completed survey. Authenticates manually.
router.post(
  '/:dao/:uuid/dump',
  loadDaoFromParams,
  loadSurveyByUuidForDao,
  dumpCompletedSurvey
)

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
