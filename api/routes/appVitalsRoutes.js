const express = require('express')
const router = express.Router()

const { body } = require('express-validator')

//const PatientModel = require('../models/patient')
const appVitalsController = require('../controllers/appVitals')
const isAuth = require('../middleware/isAuth')

router.post(
    '/v1/register/bglucose',
    isAuth,
    appVitalsController.addBGlucoseReadings
)

router.post(
    '/v1/register/bpressure',
    isAuth,
    appVitalsController.addBPressureReadings
)

router.post(
    '/v1/register/fitness',
    isAuth,
    appVitalsController.addFitnessReadings
)

router.post(
    '/v1/update/symptoms/:id',
    isAuth,
    appVitalsController.updateVitalsSymptoms
)

router.get(
    '/v1/vital/recents',
    isAuth,
    appVitalsController.getRecentReadingVitals
)

module.exports = router
