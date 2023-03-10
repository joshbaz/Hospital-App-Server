const jwt = require('jsonwebtoken')
const PatientModel = require('../models/patient')
require('dotenv').config()

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization')

    if (!authHeader) {
        const error = new Error('Not authenticated')
        error.statusCode = 401
        throw error
    }

    const token = authHeader.split(' ')[1]
    let decodedToken

    try {
        decodedToken = jwt.verify(token, process.env.SECRET)
    } catch (err) {
        err.statusCode = 500
        throw err
    }

    if (!decodedToken) {
        const error = new Error('Not authenticated')
        error.statusCode = 401
        throw error
    }

    req.userId = decodedToken.userId

    const runCheck = async () => {
        try {
            const findAdmin = await PatientModel.findById(decodedToken.userId)
            if (!findAdmin) {
                const error = new Error('Not authorized')
                error.statusCode = 403
                throw error
            }

            next()
        } catch (error) {
            err.statusCode = 500
            throw err
        }
    }

    runCheck()
    // next()
}
