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
        const startOfWeek = Moments()
            .tz('Africa/Nairobi')
            .startOf('week')
            .toString()

        const endOfWeek = Moments()
            .tz('Africa/Nairobi')
            .endOf('week')
            .toString()
        console.log('start of week', startOfWeek, endOfWeek)
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

        //console.log('findBPressureVitals', findBPressureVitals)

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

// statistical blood glucose
exports.getStatisticalGlucoseVitals = async (req, res, next) => {
    try {
        const startOfDay = Moments()
            .tz('Africa/Nairobi')
            .startOf('day')
            .toString()

        const startOfWeek = Moments()
            .tz('Africa/Nairobi')
            .startOf('isoWeek')
            .toString()

        const endOfWeek = Moments()
            .tz('Africa/Nairobi')
            .endOf('isoWeek')
            .toString()
        // console.log('start of week', startOfWeek, endOfWeek)

        const endOfDay = Moments().tz('Africa/Nairobi').endOf('day').toString()
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')
        const Year = Moments().tz('Africa/Nairobi').format('YYYY')
        const findPatient = await PatientModel.findById(req.userId)
        if (!findPatient) {
            const error = new Error('User does not exist')
            error.statusCode = 404
            throw error
        }

        // days statistics
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
        }).sort({ createdDate: 1 })

        // weeks statistics
        const findWeekBGlucoseVitals = await VitalModel.find({
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
                    createdDate: {
                        $gte: startOfWeek,
                        $lt: endOfWeek,
                    },
                },
            ],
        }).sort({ createdAt: 1 })

        // console.log('find day glucose vitals', findBGlucoseVitals)

        // console.log('find weeks glucose vitals222', findWeekBGlucoseVitals)

        //averagee vitals
        let averageVital = 0

        if (findBGlucoseVitals.length > 0) {
            let filteredss = findBGlucoseVitals.map((data) => {
                return parseFloat(data.healthVital)
            })

            averageVital =
                filteredss.reduce((sum, next) => sum + next, 0) /
                filteredss.length
            //  console.log('filtered Vitals', filteredss, averageVital)
        } else {
        }

        //lowest vital & highest vital
        let lowestVital = 0
        let highestVital = 0
        if (findWeekBGlucoseVitals.length > 0) {
            let filtereds = findWeekBGlucoseVitals.map((data) => {
                return parseFloat(data.healthVital)
            })

            if (filtereds.length > 1) {
                lowestVital = Math.min(...filtereds)
                highestVital = Math.max(...filtereds)
            }

            //  console.log('filtered Vitals', filtered, averageVital)
        } else {
        }

        // graph entries
        let graphEntries = []

        if (findWeekBGlucoseVitals.length > 0) {
            let filtered = findWeekBGlucoseVitals.map((data) => {
                let dates = Moments(new Date(data.createdDate))
                    .tz('Africa/Nairobi')
                    .format('dddDD')
                return {
                    x: dates,
                    y: parseFloat(data.healthVital),
                }
            })

            let newFilteration = []
            for (let iteration = 0; iteration < filtered.length; iteration++) {
                let totalIterations = iteration + 1
                //check if new array has a value

                if (newFilteration.length > 0) {
                    for (
                        let newIterate = 0;
                        newIterate < newFilteration.length;
                        newIterate++
                    ) {
                        let ttNewIteration = newIterate + 1

                        //check if we have similar dates
                        if (
                            newFilteration[newIterate].x ===
                            filtered[iteration].x
                        ) {
                            newFilteration[newIterate].y =
                                (newFilteration[newIterate].y +
                                    filtered[iteration].y) /
                                2
                            break
                        }

                        if (
                            ttNewIteration === newFilteration.length &&
                            newFilteration[newIterate].x !==
                                filtered[iteration].x
                        ) {
                            newFilteration.push({
                                x: filtered[iteration].x,
                                y: parseFloat(filtered[iteration].y),
                            })

                            break
                        }
                    }
                } else {
                    newFilteration.push({
                        x: filtered[iteration].x,
                        y: parseFloat(filtered[iteration].y),
                    })
                }

                if (totalIterations === filtered.length) {
                    graphEntries = newFilteration
                }
            }
        } else {
        }

        res.status(200).json({
            avgVital: averageVital,
            lowestVital: lowestVital,
            highestVital: highestVital,
            todayEntries: findBGlucoseVitals,
            weekEntries: findWeekBGlucoseVitals,
            graphEntries: graphEntries,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

// statistical blood glucose
exports.getStatisticalPressureVitals = async (req, res, next) => {
    try {
        const startOfDay = Moments()
            .tz('Africa/Nairobi')
            .startOf('day')
            .toString()

        const startOfWeek = Moments()
            .tz('Africa/Nairobi')
            .startOf('isoWeek')
            .toString()

        const endOfWeek = Moments()
            .tz('Africa/Nairobi')
            .endOf('isoWeek')
            .toString()
        console.log('start of week', startOfWeek, endOfWeek)

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
        }).sort({ createdDate: 1 })

        // weeks statistics
        const findWeekBPressureVitals = await VitalModel.find({
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
                    createdDate: {
                        $gte: startOfWeek,
                        $lt: endOfWeek,
                    },
                },
            ],
        }).sort({ createdAt: 1 })

        // console.log('find day pressure vitals', findBPressureVitals)

        // console.log('find weeks pressure vitals', findWeekBPressureVitals)

        //averagee vitals
        let averageVitalSys = 0
        let averageVitalDia = 0

        if (findBPressureVitals.length > 0) {
            let filteredss = findBPressureVitals.map((data) => {
                let splitdata = data.healthVital.split('/')[0]
                return parseFloat(splitdata)
            })

            let filteredss2 = findBPressureVitals.map((data) => {
                let splitdata2 = data.healthVital.split('/')[1]
                return parseFloat(splitdata2)
            })

            averageVitalSys =
                filteredss.reduce((sum, next) => sum + next, 0) /
                filteredss.length

            averageVitalDia =
                filteredss2.reduce((sum, next) => sum + next, 0) /
                filteredss2.length
            //  console.log('filtered Vitals', filteredss, averageVital)
        } else {
        }

        //lowest vital & highest vital
        let lowestVitalSys = 0
        let lowestVitalDia = 0

        let highestVitalSys = 0
        let highestVitalDia = 0

        if (findWeekBPressureVitals.length > 0) {
            let filteredss = findBPressureVitals.map((data) => {
                let splitdata = data.healthVital.split('/')[0]
                return parseFloat(splitdata)
            })

            let filteredss2 = findBPressureVitals.map((data) => {
                let splitdata2 = data.healthVital.split('/')[1]
                return parseFloat(splitdata2)
            })

            if (filteredss.length > 1) {
                lowestVitalSys = Math.min(...filteredss)
                highestVitalSys = Math.max(...filteredss)
            }

            if (filteredss2.length > 1) {
                lowestVitalDia = Math.min(...filteredss2)
                highestVitalDia = Math.max(...filteredss2)
            }

            //  console.log('filtered Vitals', filtered, averageVital)
        } else {
        }

        let lineEntries1 = []

        if (findWeekBPressureVitals.length > 0) {
            let filtered = findWeekBPressureVitals.map((data) => {
                let dates = Moments(new Date(data.createdDate))
                    .tz('Africa/Nairobi')
                    .format('dddDD')
                let splitdata = data.healthVital.split('/')[0]
                return {
                    x: dates,
                    y: parseFloat(splitdata),
                }
            })

            let newFilteration = []
            for (let iteration = 0; iteration < filtered.length; iteration++) {
                let totalIterations = iteration + 1
                //check if new array has a value

                if (newFilteration.length > 0) {
                    for (
                        let newIterate = 0;
                        newIterate < newFilteration.length;
                        newIterate++
                    ) {
                        let ttNewIteration = newIterate + 1

                        //check if we have similar dates
                        if (
                            newFilteration[newIterate].x ===
                            filtered[iteration].x
                        ) {
                            newFilteration[newIterate].y =
                                (newFilteration[newIterate].y +
                                    filtered[iteration].y) /
                                2
                            break
                        }

                        if (
                            ttNewIteration === newFilteration.length &&
                            newFilteration[newIterate].x !==
                                filtered[iteration].x
                        ) {
                            newFilteration.push({
                                x: filtered[iteration].x,
                                y: parseFloat(filtered[iteration].y),
                            })

                            break
                        }
                    }
                } else {
                    newFilteration.push({
                        x: filtered[iteration].x,
                        y: parseFloat(filtered[iteration].y),
                    })
                }

                if (totalIterations === filtered.length) {
                    lineEntries1 = newFilteration
                }
            }
        } else {
        }

        let lineEntries2 = []

        if (findWeekBPressureVitals.length > 0) {
            let filtered = findWeekBPressureVitals.map((data) => {
                let dates = Moments(new Date(data.createdDate))
                    .tz('Africa/Nairobi')
                    .format('dddDD')
                let splitdata = data.healthVital.split('/')[1]
                return {
                    x: dates,
                    y: parseFloat(splitdata),
                }
            })

            let newFilteration = []
            for (let iteration = 0; iteration < filtered.length; iteration++) {
                let totalIterations = iteration + 1
                //check if new array has a value

                if (newFilteration.length > 0) {
                    for (
                        let newIterate = 0;
                        newIterate < newFilteration.length;
                        newIterate++
                    ) {
                        let ttNewIteration = newIterate + 1

                        //check if we have similar dates
                        if (
                            newFilteration[newIterate].x ===
                            filtered[iteration].x
                        ) {
                            newFilteration[newIterate].y =
                                (newFilteration[newIterate].y +
                                    filtered[iteration].y) /
                                2
                            break
                        }

                        if (
                            ttNewIteration === newFilteration.length &&
                            newFilteration[newIterate].x !==
                                filtered[iteration].x
                        ) {
                            newFilteration.push({
                                x: filtered[iteration].x,
                                y: parseFloat(filtered[iteration].y),
                            })

                            break
                        }
                    }
                } else {
                    newFilteration.push({
                        x: filtered[iteration].x,
                        y: parseFloat(filtered[iteration].y),
                    })
                }

                if (totalIterations === filtered.length) {
                    lineEntries2 = newFilteration
                }
            }
        } else {
        }

        //console.log('line entries', lineEntries2, lineEntries1)

        res.status(200).json({
            avgVital: `${averageVitalSys}/${averageVitalDia}`,
            lowestVital: `${lowestVitalSys}/${lowestVitalDia}`,
            highestVital: `${highestVitalSys}/${highestVitalDia}`,
            todayEntries: findBPressureVitals,
            weekEntries: findWeekBPressureVitals,
            line1Entries: lineEntries1,
            line2Entries: lineEntries2,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
