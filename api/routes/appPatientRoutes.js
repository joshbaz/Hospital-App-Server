const express = require('express')
const router = express.Router()

const { body } = require('express-validator')

const PatientModel = require('../models/patient')
const appPatientController = require('../controllers/appPatient')
//const isAdminAuth = require('../middleware/isAdminAuth')

router.post('/v1/login', appPatientController.loginPatient)

router.post('/v1/register', appPatientController.registerPatient)

module.exports = router
