const PatientModel = require('../models/patient')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const VitalModel = require('../models/vital')
const Moments = require('moment-timezone')
const io = require('../../socket')

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
        const creationDateFormat = Moments(new Date(currentDate))
            .tz('Africa/Nairobi')
            .format('DD-MM-YYYY')
        const Month = Moments(new Date(currentDate))
            .tz('Africa/Nairobi')
            .format('MMMM')
        const createdDate = Moments(new Date(currentDate)).tz('Africa/Nairobi')
        const Year = Moments(new Date(currentDate))
            .tz('Africa/Nairobi')
            .format('YYYY')

        //statuses
        /**
         *  normal - 72 >= 108
         *  concern(borderline) - 108 >= 180
         * low - 72 - 49
         *  critical low - 50 and below
         *  high - 181 - 314
         *  critical high - 315 >
         *
         * N/A
         *
         */

        let glucoseValueInt = parseFloat(glucoseValue)

        let status = ''

        if (glucoseValueInt <= 50) {
            status = 'critical low'
        } else if (glucoseValueInt >= 49 && glucoseValueInt <= 72) {
            status = 'low'
        } else if (glucoseValueInt >= 72 && glucoseValueInt <= 108) {
            status = 'normal'
        } else if (glucoseValueInt >= 109 && glucoseValueInt <= 180) {
            status = 'concern'
        } else if (glucoseValueInt >= 181 && glucoseValueInt <= 314) {
            status = 'high'
        } else if (glucoseValueInt >= 315) {
            status = 'critical high'
        }

        const newVitals = new VitalModel({
            _id: new mongoose.Types.ObjectId(),
            patientId: findPatient.patientId,
            patientUniqueId: findPatient._id,
            vitalTimelineType,
            dateMeasured: currentDate,
            healthType: 'Blood Glucose',
            healthVital: glucoseValue,
            creationDateFormat,
            creationMonth: Month,
            creationYear: Year,
            createdDate,
            status,
            vitalRecodedTime: currentTime,
        })

        let saveVitals = await newVitals.save()

        io.getIO().emit('update-dash-vitals', {
            actions: 'request-vitals-bg',
        })

        io.getIO().emit('update-dash-patient', {
            actions: 'request-vital-pull',
            data: findPatient._id,
        })

        if (
            status === 'low' ||
            status === 'high' ||
            status === 'critical high' ||
            status === 'critical low'
        ) {
            io.getIO().emit('update-elist-vitals', {
                actions: 'request-vitals-elist',
            })
        } else {
        }

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
        const creationDateFormat = Moments(newDate)
            .tz('Africa/Nairobi')
            .format('DD-MM-YYYY')
        const Month = Moments(newDate).tz('Africa/Nairobi').format('MMMM')
        const createdDate = Moments(newDate).tz('Africa/Nairobi')
        const Year = Moments(newDate).tz('Africa/Nairobi').format('YYYY')

        //statuses
        //systolic
        /**
         *  normal - 91 < 130
         *  concern(borderline) - 131 >= 140
         * low - 51 - 90
         *  critical low - 50 and below
         *  high - 141 - 160
         *  critical high - 161 >
         *
         * N/A
         *
         */

        //diastolic
        /**
         *  normal - 61 >= 80
         *  concern(borderline) - 81 >= 90
         * low - 40 - 60
         *  critical low - 39 and below
         *  high - 91 - 100
         *  critical high - 101 >
         *
         * N/A
         *
         */
        let sysValueInt = parseFloat(sysValue)
        let diaValueInt = parseFloat(diaValue)
        let status = ''

        if (sysValueInt <= 50) {
            status = 'critical low'
        } else if (sysValueInt >= 51 && sysValueInt <= 90) {
            status = 'low'
        } else if (sysValueInt >= 91 && sysValueInt <= 130) {
            //check the diastolic
            if (diaValueInt < 39) {
                status = 'critical low'
            } else if (diaValueInt >= 40 && diaValueInt <= 60) {
                status = 'low'
            } else if (diaValueInt >= 61 && diaValueInt <= 80) {
                status = 'normal'
            } else if (diaValueInt >= 81 && diaValueInt <= 90) {
                status = 'concern'
            } else if (diaValueInt >= 91 && diaValueInt <= 100) {
                status = 'high'
            } else if (diaValueInt >= 101) {
                status = 'critical high'
            }
        } else if (sysValueInt >= 131 && sysValueInt <= 140) {
            status = 'concern'
        } else if (sysValueInt >= 141 && sysValueInt <= 160) {
            status = 'high'
        } else if (sysValueInt >= 161) {
            status = 'critical high'
        }

        const newVitals = new VitalModel({
            _id: new mongoose.Types.ObjectId(),
            patientId: findPatient.patientId,
            patientUniqueId: findPatient._id,
            vitalTimelineType,
            dateMeasured: currentDate,
            healthType: 'Blood Pressure',
            healthVital: healthVital,
            creationDateFormat,
            creationMonth: Month,
            creationYear: Year,
            createdDate,
            status,
            pulseValue,
            vitalRecodedTime: currentTime,
        })

        let saveVitals = await newVitals.save()

        io.getIO().emit('update-dash-vitals', {
            actions: 'request-vitals-bp',
        })

         io.getIO().emit('update-dash-patient', {
             actions: 'request-vital-pull',
             data: findPatient._id,
         })

        if (
            status === 'low' ||
            status === 'high' ||
            status === 'critical high' ||
            status === 'critical low'
        ) {
            io.getIO().emit('update-elist-vitals', {
                actions: 'request-vitals-elist',
            })
        } else {
        }

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
        const creationDateFormat = Moments(new Date(currentDate))
            .tz('Africa/Nairobi')
            .format('DD-MM-YYYY')
        const Month = Moments(currentDate).tz('Africa/Nairobi').format('MMMM')
        const createdDate = Moments(currentDate).tz('Africa/Nairobi')
        const Year = Moments(currentDate).tz('Africa/Nairobi').format('YYYY')
        let status = 'N/A'

        const newVitals = new VitalModel({
            _id: new mongoose.Types.ObjectId(),
            patientId: findPatient.patientId,
            patientUniqueId: findPatient._id,
            vitalTimelineType,
            dateMeasured: currentDate,
            healthType: 'Fitness Activities',
            healthVital: healthVital,
            creationDateFormat,
            creationMonth: Month,
            creationYear: Year,
            createdDate,
            status,
            vitalRecodedTime: currentTime,
        })

        let saveVitals = await newVitals.save()

        io.getIO().emit('update-dash-vitals', {
            actions: 'request-vitals-fa',
        })

         io.getIO().emit('update-dash-patient', {
             actions: 'request-vital-pull',
             data: findPatient._id,
         })

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
        //console.log('start of week app readings', startOfWeek, endOfWeek)
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
        }).sort({ createdDate: 1 })

        //console.log('week', findWeekBGlucoseVitals, startOfWeek, endOfWeek)

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
            avgVital: averageVital.toFixed(3),
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
        }).sort({ createdDate: 1 })

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
            avgVital: `${averageVitalSys.toFixed(3)}/${averageVitalDia.toFixed(
                0
            )}`,
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
