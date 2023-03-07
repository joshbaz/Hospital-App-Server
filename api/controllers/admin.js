const AdminModel = require('../models/admin')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')

require('dotenv').config()

/** create administrator */
exports.createAdmin = async (req, res, next) => {
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            const error = new Error('Validation failed')
            error.statusCode = 422
            error.message = errors.error[0].msg
            throw error
        }

        // destructure body
        const { email, password, fullname, mobileNumber, jobPosition } =
            req.body

        const hash = await bcrypt.hash(password, 12)

        const adminUsers = new AdminModel({
            _id: new mongoose.Types.ObjectId(),
            email,
            password: hash,
            fullname,
            authType: 'superAdmin',
            mobileNumber,
            jobPosition,
        })

        await adminUsers.save()

        res.status(201).json(`administrator with email ${email} registered`)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** login administrator */
exports.loginAdmin = async (req, res, next) => {
    try {
        // destructure body
        const { email, password } = req.body

        const findOneUser = await AdminModel.findOne({ email: email })
       // console.log('token ', findOneUser)
        if (!findOneUser) {
            const error = new Error('Email does not exist')
            error.statusCode = 404
            throw error
        }

        const comparePassword = await bcrypt.compare(
            password,
            findOneUser.password
        )
        //console.log('comparePassword ', comparePassword)

        if (!comparePassword) {
            const error = new Error('Wrong Password')
            error.statusCode = 401
            throw error
        }

        const token = jwt.sign(
            {
                email: findOneUser.email,
                userId: findOneUser._id,
            },
            process.env.SECRET,
            { expiresIn: '24h' }
        )
        //console.log('token ', token)

        res.status(200).json({
            token: token,
            id: findOneUser._id.toString(),
            email: findOneUser.email,
            fullname: findOneUser.fullname,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** all details */
exports.getAllUserDetails = async (req, res, next) => {
    try {
        const findOneUser = await AdminModel.findById(req.userId)

        //console.log('req.userId', req.userId)
        if (!findOneUser) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        res.status(200).json({
            id: findOneUser._id.toString(),
            email: findOneUser.email,
            fullname: findOneUser.fullname,
            mobileNumber: findOneUser.mobileNumber,
            jobPosition: findOneUser.jobPosition,
            emailLogins: findOneUser.emailLogins,
            emailEmergency: findOneUser.emailEmergency,
            emailNewPatients: findOneUser.emailNewPatients,
            emailMonthlyUpadtes: findOneUser.emailMonthlyUpadtes,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** update user details */
exports.updateDetails = async (req, res, next) => {
    try {
        const { fullname, mobileNumber, jobPosition } = req.body
        const findOneUser = await AdminModel.findById(req.userId)

        //console.log('req.userId', req.userId)
        if (!findOneUser) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        findOneUser.fullname = fullname
        findOneUser.mobileNumber = mobileNumber
        findOneUser.jobPosition = jobPosition

        await findOneUser.save()

        res.status(200).json('Account details updated')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** update settings */
exports.updateSettings = async (req, res, next) => {
    try {
        const { emailEmergency, emailNewPatients } = req.body
        const findOneUser = await AdminModel.findById(req.userId)

        //console.log('req', req.userId)
        if (!findOneUser) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        findOneUser.emailEmergency = emailEmergency
        findOneUser.emailNewPatients = emailNewPatients

        await findOneUser.save()

        res.status(200).json('Account settings updated')
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
        const findOneUser = await AdminModel.findById(req.userId)

        //console.log('req.userId', req.userId)
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
