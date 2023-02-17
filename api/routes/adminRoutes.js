const express = require('express')
const router = express.Router()

const { body } = require('express-validator')

const AdminModel = require('../models/admin')
const adminController = require('../controllers/admin')
const isAdminAuth = require('../middleware/isAdminAuth')

router.post(
    '/v1/create',
    isAdminAuth,
    [
        body('email')
            .isEmail()
            .withMessage('Please insert a valid Email')
            .custom((value, { req }) => {
                return AdminModel.findOne({ email: value }).then((emails) => {
                    if (emails) {
                        return Promise.reject('Email already exists')
                    }
                })
            })
            .normalizeEmail(),
        body('password')
            .trim()
            .isLength({ min: 6 })
            .withMessage('Please insert a valid Password'),
    ],
    adminController.createAdmin
)

router.post('/v1/login', adminController.loginAdmin)

router.get('/v1/details', isAdminAuth, adminController.getAllUserDetails)

router.put('/v1/update/details', isAdminAuth, adminController.updateDetails)

router.put('/v1/update/settings', isAdminAuth, adminController.updateSettings)

router.put('/v1/update/passkey', isAdminAuth, adminController.updatePassword)
module.exports = router
