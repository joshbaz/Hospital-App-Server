const PatientModel = require('../models/patient')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const VitalModel = require('../models/vital')
const Moments = require('moment-timezone')

/** patient onboarding */
exports.addBGlucoseReadings = async (req, res, next) => {
    try {
        const { glucoseValue, currentDate, currentTime, vitalTimelineType } =
            req.body

        const findPatient = await PatientModel.findById(req.userId)

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        const Month = Moments(new Date(currentDate))
            .tz('Africa/Nairobi')
            .format('MMMM')
        const createdDate = Moments(new Date(currentDate)).tz('Africa/Nairobi')
        const Year = Moments(new Date(currentDate))
            .tz('Africa/Nairobi')
            .format('YYYY')
        let status = 'normal'

        const newVitals = new VitalModel({
            _id: new mongoose.Types.ObjectId(),
            patientId: findPatient.patientId,
            patientUniqueId: findPatient._id,
            vitalTimelineType,
            dateMeasured: currentDate,
            healthType: 'Blood Glucose',
            healthVital: glucoseValue,
            creationMonth: Month,
            creationYear: Year,
            createdDate,
            status,
            vitalRecodedTime: currentTime,
        })

        let saveVitals = await newVitals.save()

        res.status(200).json({
            message: 'B-Glucose Vitals recorded',
            savedVitals: saveVitals._id,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

exports.updateVitalsSymptoms = async (req, res, next) => {
    try {
        const vitalsId = req.params.id
        const { feeling, symptoms } = req.body

        const findPatient = await PatientModel.findById(req.userId)

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        const findVitals = await VitalModel.findById(vitalsId)

        if (!findVitals) {
            const error = new Error('Health vital does not exist')
            error.statusCode = 404
            throw error
        }

        findVitals.otherSymptoms = {
            feeling,
            symptoms,
        }

        await findVitals.save()

        res.status(200).json('Symptoms have been recorded')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** blood pressure */
exports.addBPressureReadings = async (req, res, next) => {
    try {
        const {
            sysValue,
            diaValue,
            pulseValue,
            currentDate,
            currentTime,
            vitalTimelineType,
        } = req.body
        let healthVital = `${sysValue}/${diaValue}`
        const findPatient = await PatientModel.findById(req.userId)

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        let newDate = new Date(currentDate)

        const Month = Moments(newDate).tz('Africa/Nairobi').format('MMMM')
        const createdDate = Moments(newDate).tz('Africa/Nairobi')
        const Year = Moments(newDate).tz('Africa/Nairobi').format('YYYY')
        let status = 'normal'

        const newVitals = new VitalModel({
            _id: new mongoose.Types.ObjectId(),
            patientId: findPatient.patientId,
            patientUniqueId: findPatient._id,
            vitalTimelineType,
            dateMeasured: currentDate,
            healthType: 'Blood Pressure',
            healthVital: healthVital,
            creationMonth: Month,
            creationYear: Year,
            createdDate,
            status,
            pulseValue,
            vitalRecodedTime: currentTime,
        })

        let saveVitals = await newVitals.save()

        res.status(200).json({
            message: 'B-Pressure Vitals recorded',
            savedVitals: saveVitals._id,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** blood pressure */
exports.addFitnessReadings = async (req, res, next) => {
    try {
        const {
            durationValue,
            chosenActivity,
            currentDate,
            currentTime,
            vitalTimelineType,
        } = req.body

        let healthVital = `${chosenActivity} (${durationValue} mins)`
        const findPatient = await PatientModel.findById(req.userId)

        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        const Month = Moments(currentDate).tz('Africa/Nairobi').format('MMMM')
        const createdDate = Moments(currentDate).tz('Africa/Nairobi')
        const Year = Moments(currentDate).tz('Africa/Nairobi').format('YYYY')
        let status = 'normal'

        const newVitals = new VitalModel({
            _id: new mongoose.Types.ObjectId(),
            patientId: findPatient.patientId,
            patientUniqueId: findPatient._id,
            vitalTimelineType,
            dateMeasured: currentDate,
            healthType: 'Fitness Activities',
            healthVital: healthVital,
            creationMonth: Month,
            creationYear: Year,
            createdDate,
            status,
            vitalRecodedTime: currentTime,
        })

        let saveVitals = await newVitals.save()

        res.status(200).json({
            message: 'Fitness Activities recorded',
            savedVitals: saveVitals._id,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

exports.getRecentReadingVitals = async (req, res, next) => {
    try {
        const startOfDay = Moments()
            .tz('Africa/Nairobi')
            .startOf('day')
            .toString()

        const endOfDay = Moments().tz('Africa/Nairobi').endOf('day').toString()
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')
        const Year = Moments().tz('Africa/Nairobi').format('YYYY')
        const findPatient = await PatientModel.findById(req.userId)
        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        const findBPressureVitals = await VitalModel.find({
            $and: [
                {
                    patientUniqueId: findPatient._id,
                },
                {
                    healthType: {
                        $in: ['Blood Pressure'],
                    },
                },
                {
                    creationMonth: {
                        $in: [Month],
                    },
                },
                {
                    creationYear: {
                        $in: [Year],
                    },
                },
                {
                    createdDate: {
                        $gte: startOfDay,
                        $lt: endOfDay,
                    },
                },
            ],
        }).sort({ createdDate: -1 })

        //console.log('startOfDay', startOfDay, endOfDay)
        //console.log('find bPressure vitals', findBPressureVitals)
        const findBGlucoseVitals = await VitalModel.find({
            $and: [
                {
                    patientUniqueId: findPatient._id,
                },
                {
                    healthType: {
                        $in: ['Blood Glucose'],
                    },
                },
                {
                    creationMonth: {
                        $in: [Month],
                    },
                },
                {
                    creationYear: {
                        $in: [Year],
                    },
                },

                {
                    createdDate: {
                        $gte: startOfDay,
                        $lt: endOfDay,
                    },
                },
            ],
        }).sort({ createdDate: -1 })

        //console.log('find glucose vitals', findBGlucoseVitals)

        let pressureVitals =
            findBPressureVitals.length > 0
                ? findBPressureVitals[0].healthVital
                : '0/0'
        let glucoseVitals =
            findBGlucoseVitals.length > 0
                ? findBGlucoseVitals[0].healthVital
                : '0'
        res.status(200).json({
            BPressureVital: pressureVitals,
            BGlucoseVital: glucoseVitals,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
