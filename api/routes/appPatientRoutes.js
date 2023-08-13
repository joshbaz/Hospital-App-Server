const express = require('express')
const router = express.Router()

const { body } = require('express-validator')

//const PatientModel = require('../models/patient')
const appPatientController = require('../controllers/appPatient')
const isAuth = require('../middleware/isAuth')

router.post('/v1/login', appPatientController.loginPatient)

router.post('/v1/register', appPatientController.registerPatient)

router.post('/v1/resendOTP', appPatientController.reSendOTPCode)

router.post('/v1/forgotpassword', appPatientController.forgotPasskey)

router.post('/v1/reset/verify', appPatientController.resetVerify)

router.post('/v1/reset/passkey', appPatientController.resetPasskey)

router.post('/v1/register/verify', appPatientController.registerVerify)

router.post(
    '/v1/register/onboardInfo',
    isAuth,
    appPatientController.patientOnboarding
)

router.get('/v1/details', isAuth, appPatientController.getAllUserDetails)

router.post('/v1/edit/details', isAuth, appPatientController.patientEditDetails)

router.put('/v1/update/passkey', isAuth, appPatientController.updatePassword)
module.exports = router
