const PatientModel = require('../models/patient')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config()

/** all details */
exports.getAllUserDetails = async (req, res, next) => {
    try {
        const findOneUser = await PatientModel.findById(req.userId)

        if (!findOneUser) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        res.status(200).json({
            id: findOneUser._id.toString(),
            phoneNumber: findOneUser.phoneNumber,
            fullname: findOneUser.patientName,
            patId: findOneUser.patientId,
            birthday: findOneUser.birthday,
            weight: findOneUser.weight,
            height: findOneUser.height,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

//login
exports.loginPatient = async (req, res, next) => {
    try {
        const { phoneNumber, password } = req.body
        const findOneUser = await PatientModel.findOne({
            phoneNumber: phoneNumber,
        })

        console.log('trrrrrrrrr')

        if (!findOneUser) {
            console.log('errro')
            const error = new Error('User with that Number does not exist')
            error.statusCode = 404
            throw error
        }

        if (!findOneUser.verified) {
            const error = new Error('User with that Number does not exist')
            error.statusCode = 404
            throw error
        }

        const comparePassword = await bcrypt.compare(
            password,
            findOneUser.password
        )

        if (!comparePassword) {
            const error = new Error('Wrong Password')
            error.statusCode = 401
            throw error
        }

        const token = jwt.sign(
            {
                phoneNumber: findOneUser.phoneNumber,
                userId: findOneUser._id,
            },
            process.env.SECRET,
            { expiresIn: '24h' }
        )
        res.status(200).json({
            token: token,
            id: findOneUser._id.toString(),
            phoneNumber: findOneUser.phoneNumber,
            fullname: findOneUser.patientName,
            onBoardInfo: findOneUser.onBoardInfo,
            patId: findOneUser.patientId,
        })
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
        const { phoneNumber, password } = req.body

        const hash = await bcrypt.hash(password, 12)

        const findPatient = await PatientModel.findOne({
            phoneNumber: phoneNumber,
        })

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        if (findPatient.verified === true) {
            const error = new Error('Patient already registered')
            error.statusCode = 404
            throw error
        }

        const otp = `${Math.floor(1000 + Math.random() * 9000)}`

        findPatient.unVerifiedPassword = hash
        findPatient.verificationToken = otp
        await findPatient.save()

        const accountSid = process.env.ACCOUNT_SID
        const authToken = process.env.AUTH_TOKEN
        const verifySid = process.env.VERIFY_SID

        const client = require('twilio')(accountSid, authToken)

        // await client.messages.create({
        //     body: `verification code : ${otp}`,
        //     from: '+256787785114',
        //     to: findPatient.phoneNumber,
        // })

        res.status(200).json({
            message: 'Verification Code sent to your number',
            phoneNumber: findPatient.phoneNumber,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** registration verification */
exports.registerVerify = async (req, res, next) => {
    try {
        const { phoneNumber, otpString, platform } = req.body

        const findPatient = await PatientModel.findOne({
            phoneNumber: phoneNumber,
        })

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }
        if (findPatient.verified === true) {
            const error = new Error('Account already verified')
            error.statusCode = 404
            throw error
        }

        if (findPatient.verificationToken !== otpString) {
            const error = new Error('OTP incorrect')
            error.statusCode = 404
            throw error
        }

        findPatient.password = findPatient.unVerifiedPassword
        findPatient.verificationToken = ''
        findPatient.verified = true
        findPatient.platform = platform
        await findPatient.save()

        findPatient.unVerifiedPassword = ''
        await findPatient.save()

        const token = jwt.sign(
            {
                phoneNumber: findPatient.phoneNumber,
                userId: findPatient._id,
            },
            process.env.SECRET,
            { expiresIn: '24h' }
        )

        res.status(200).json({
            token: token,
            id: findPatient._id.toString(),
            phoneNumber: findPatient.phoneNumber,
            fullname: findPatient.patientName,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** patient onboarding */
exports.patientOnboarding = async (req, res, next) => {
    try {
        const { patientId, fullname, birthday, weight, height } = req.body

        const findPatient = await PatientModel.findById(req.userId)

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        if (findPatient.patientId.toLowerCase() !== patientId.toLowerCase()) {
            const error = new Error('patient Id is incorrect')
            error.statusCode = 404
            throw error
        }

        findPatient.patientName = fullname
        findPatient.birthday = birthday
        findPatient.weight = weight
        findPatient.height = height

        findPatient.onBoardInfo = true

        await findPatient.save()

        res.status(200).json('Information Updated')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** edit personal details */
exports.patientEditDetails = async (req, res, next) => {
    try {
        const { patientId, fullname, birthday, weight, height } = req.body

        const findPatient = await PatientModel.findById(req.userId)

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        if (findPatient.patientId.toLowerCase() !== patientId.toLowerCase()) {
            const error = new Error('patient Id is incorrect')
            error.statusCode = 404
            throw error
        }

        findPatient.patientName = fullname
        findPatient.birthday = birthday
        findPatient.weight = weight
        findPatient.height = height

        await findPatient.save()

        res.status(200).json('Information Updated')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}


/** change password */
exports.updatePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body
        const findOneUser = await PatientModel.findById(req.userId)

        
        if (!findOneUser) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        const comparePassword = await bcrypt.compare(
            oldPassword,
            findOneUser.password
        )

        if (!comparePassword) {
            const error = new Error('Wrong Password')
            error.statusCode = 401
            throw error
        }

        const hash = await bcrypt.hash(newPassword, 12)

        findOneUser.password = hash

        await findOneUser.save()

        res.status(200).json('Account passkey updated')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

