const express = require('express')
const router = express.Router()

const patientController = require('../controllers/patient')
const isAdminAuth = require('../middleware/isAdminAuth')

router.post('/v1/create', isAdminAuth, patientController.createPatient)

router.post(
    '/v1/prescription/create/:id',
    isAdminAuth,
    patientController.createPrescription
)

router.put(
    '/v1/prescription/update/:id',
    isAdminAuth,
    patientController.editPrescription
)

router.get('/v1/all', isAdminAuth, patientController.getAllPatients)

router.get(
    '/v1/individual/vitalsummary/:id',
    isAdminAuth,
    patientController.getIndividualVitalSummary
)

router.get(
    '/v1/individual/prescriptionsummary/:id',
    isAdminAuth,
    patientController.getIndividualPrescriptionSummary
)

router.get(
    '/v1/individual/:id',
    isAdminAuth,
    patientController.getIndividualPatient
)

/** general vitals lists */
router.get('/v1/Bp/vitals/all', isAdminAuth, patientController.getAllBPVitals)
router.get('/v1/Bs/vitals/all', isAdminAuth, patientController.getAllBSVitals)
router.get('/v1/Fa/vitals/all', isAdminAuth, patientController.getAllFAVitals)
router.get(
    '/v1/Elist/vitals/all',
    isAdminAuth,
    patientController.getAllEListVitals
)

/*main vital lists*/
router.get(
    '/v1/main/vitals/all',
    isAdminAuth,
    patientController.getGeneralVitals
)

/*main vital summary*/
router.get(
    '/v1/main/vitals/summary',
    isAdminAuth,
    patientController.getGeneralVitalSummary
)

/** month vitals summary */
router.get(
    '/v1/main/monthlyvitals/summary',
    isAdminAuth,
    patientController.getVitalsMonthSummary
)

/** dashboard reports */
/** total summaries */
router.get(
    '/v1/dashboard/report/summary',
    isAdminAuth,
    patientController.getDashReportSummary
)

/** dashboard graph data */
router.get(
    '/v1/dashboard/graph/circular/summary',
    isAdminAuth,
    patientController.getDashPieGraphSummary
)

/** dashboard graph data */
router.get(
    '/v1/dashboard/graph/bar/summary',
    isAdminAuth,
    patientController.getDashBarGraphSummary
)
module.exports = router
