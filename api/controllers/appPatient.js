const PatientModel = require('../models/patient')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config()

//login
exports.loginPatient = async (req, res, next) => {
    try {
        const { phoneNumber, password } = req.body
        console.log('happening')

        res.status(200).json('required has been passed')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** registration */
exports.registerPatient = async (req, res, next) => {
    try {
        // const errors = validationResult(req)

        // if (!errors.isEmpty()) {
        //     const error = new Error('Validation failed')
        //     error.statusCode = 422
        //     error.message = errors.erros[0].msg
        //     throw error
        // }
        // const { phoneNumber, password } = req.body

        // const hash = await bcrypt.hash(password, 12)

        // const findPatient = await PatientModel.findOne({
        //     phoneNumber: phoneNumber,
        // })

        // if (!findPatient) {
        //     const error = new Error('Patient does not exist')
        //     error.statusCode = 404
        //     throw error
        // }

        // if (findPatient.verified === true) {
        //     const error = new Error('Patient already registered')
        //     error.statusCode = 404
        //     throw error
        // }

        // findPatient.password = hash

        // await findPatient.save()

        console.log('trying')

        const accountSid = process.env.ACCOUNT_SID
        const authToken = process.env.AUTH_TOKEN
        const verifySid = process.env.VERIFY_SID

        const client = require('twilio')(accountSid, authToken)

        // client.verify.v2
        //     .services(verifySid)
        //     .verifications.create({ to: '+256787785114', channel: 'sms' })
        //     .then((verification) => console.log(verification.status))
        //     .then(() => {
        //         const readline = require('readline').createInterface({
        //             input: process.stdin,
        //             output: process.stdout,
        //         })
        //         readline.question('Please enter the OTP:', (otpCode) => {
        //             client.verify.v2
        //                 .services(verifySid)
        //                 .verificationChecks.create({
        //                     to: '+256787785114',
        //                     code: otpCode,
        //                 })
        //                 .then((verification_check) =>
        //                     console.log(verification_check.status)
        //                 )
        //                 .then(() => readline.close())
        //         })
        //     })

        client.messages.create({body: 'sms verification for app', from: '+256787785114'})
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
