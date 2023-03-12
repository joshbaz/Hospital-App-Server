const AdminModel = require('../models/admin')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const io = require('../../socket')
const crypto = require('crypto')
const Moments = require('moment-timezone')
const fs = require('fs')
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
        const { email, password, staySigned } = req.body

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
            staySigned === false ? { expiresIn: '24h' } : null
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

        io.getIO().emit('update-users', {
            actions: 'request-user',
            data: findOneUser._id,
        })
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

        io.getIO().emit('update-users', {
            actions: 'request-user',
            data: findOneUser._id,
        })

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

/** forgot password */
exports.forgotPasskey = async (req, res, next) => {
    crypto.randomBytes(32, async (err, buffer) => {
        try {
            if (err) {
                const errors = new Error('failed reset')
                errors.statusCode = 503
                throw errors
            }

            const token = buffer.toString('hex')
            const findUser = await AdminModel.findOne({ email: req.body.email })
            if (!findUser || findUser == null) {
                const error = new Error('No account found with this email')
                error.statusCode = 404
                throw error
            }

            let newDate = new Date()

            findUser.resetToken = token
            findUser.resetTokenExpiration = Moments(Date.now() + 3600000).tz(
                'Africa/Nairobi'
            )
            const UserFirstName = findUser.fullname
            await findUser.save()

            //read and connect file to send
            // let template = fs.readFileSync('./sendAd.hjs', 'utf-8')

            // let compiledTemplate = hogan.compile(template)

            // let mailOptions = {
            //     from: 'info@alero.co.ke',
            //     to: req.body.email,
            //     subject: 'Pasword Reset',
            //     html: compiledTemplate.render({
            //         Token: token,
            //         firstName: UserFirstName,
            //     }),
            // }

            // transporter.sendMail(mailOptions, (error, data) => {
            //     if (error) {
            //         const errors = new Error('Email failed to send')
            //         errors.statusCode = 535
            //         throw errors
            //     } else {
            //         res.status(200).json('reset submitted, check email')
            //     }
            // })

            res.status(200).json('reset submitted, check email')
        } catch (error) {
            if (!error.statusCode) {
                error.statusCode = 500
            }
            next(error)
        }
    })
}

/** verify reset token */
exports.verifyResetTk = async (req, res, next) => {
    try {
        let token = req.params.token
        let findUser = await AdminModel.findOne({
            resetToken: token,
            resetTokenExpiration: {
                $gt: Moments().tz('Africa/Nairobi'),
            },
        })

        if (!findUser) {
            const error = new Error('Token invalid/ expired')
            error.statusCode = 500
            throw error
        }

        res.status(200).json('Reset Verified')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** reset the password */

exports.resetPassword = async (req, res, next) => {
    try {
        const token = req.params.token
        const newPasskey = req.body.password

        let findUser = await AdminModel.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Moments().tz('Africa/Nairobi') },
        })

        if (!findUser) {
            const error = new Error('Token Expired/ no User matched')
            error.statusCode = 403
            throw error
        }

        const hash = await bcrypt.hash(newPasskey, 12)
        findUser.password = hash
        findUser.resetToken = undefined
        findUser.resetTokenExpiration = undefined

        const saveUser = await findUser.save()

        // let template = fs.readFileSync('./passUpdate.hjs', 'utf-8')

        // let compiledTemplate = hogan.compile(template)

        // let mailOptions = {
        //     from: 'info@classandsasskenya.co.ke',
        //     to: saveUser.email,
        //     subject: 'PASSWORD CHANGED',
        //     html: compiledTemplate.render({
        //         firstName: saveUser.firstname,
        //     }),
        // }
        // transporter.sendMail(mailOptions, function (err, data) {
        //     if (err) {
        //         const errors = new Error('Email failed to send')
        //         errors.statusCode = 535
        //         throw errors
        //     } else {
        //         res.status(200).json('Passkey Updated')
        //     }
        // })

        res.status(200).json('Passkey Updated')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
