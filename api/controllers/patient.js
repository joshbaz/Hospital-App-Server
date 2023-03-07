const PatientModel = require('../models/patient')
const IdTrackModel = require('../models/IdTracking')
const PrescriptionIdTrackModel = require('../models/idTrackPrescription')
const PrescriptionModel = require('../models/prescription')
const RefillModel = require('../models/refillRequest')
const VitalModel = require('../models/vital')
const mongoose = require('mongoose')
const Moments = require('moment-timezone')
const io = require('../../socket')

exports.createPatient = async (req, res, next) => {
    try {
        const { patientName, phoneNumber, birthday } = req.body
        let currentDate = Moments(new Date()).tz('Africa/Nairobi')

        const newPatient = new PatientModel({
            _id: new mongoose.Types.ObjectId(),
            patientName,
            phoneNumber,
            birthday,
            createdDate: currentDate,
        })

        let savedPatient = await newPatient.save()

        //create the new Patient Id
        const findIdTrackNumber = await IdTrackModel.find().countDocuments()
        if (findIdTrackNumber < 1) {
            const newIdTrack = new IdTrackModel({
                _id: new mongoose.Types.ObjectId(),
            })

            await newIdTrack.save()
        } else {
        }

        //retrieve id and create patientId
        const findIdTrack = await IdTrackModel.findOne()

        let newPatientNo = findIdTrack.currentNumber + 1
        let desiredPatientNo = newPatientNo.toString().padStart(5, '0')
        let patientIds = findIdTrack.hospitalIdentity + desiredPatientNo
        savedPatient.patientId = patientIds

        await savedPatient.save()

        findIdTrack.currentNumber = newPatientNo

        await findIdTrack.save()

        io.getIO().emit('update-patients', {
            actions: 'new-patient',
        })
        res.status(201).json(`New Patient  created`)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

// create prescription
exports.createPrescription = async (req, res, next) => {
    try {
        const patientId = req.params.id
        const { drugName, genericName, drugclass, active, prescribed } =
            req.body
        let currentDate = Moments(new Date()).tz('Africa/Nairobi')

        let createdMonth = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('MMMM')
        let createdYear = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('YYYY')
        const getPatient = await PatientModel.findById(patientId)

        if (!getPatient) {
            const error = new Error('Patient not found')
            error.statusCode = 404
            throw error
        }

        const newPrescription = new PrescriptionModel({
            _id: new mongoose.Types.ObjectId(),
            drugName,
            genericName,
            drugclass,
            prescribed,
            patientUniqueId: patientId,
            createdMonth,
            createdYear,
            lastPrescribed: currentDate,
            status: active,
        })

        let savedPrescription = await newPrescription.save()

        //create the new Patient Id
        const findIdTrackNumber =
            await PrescriptionIdTrackModel.find().countDocuments()
        // console.log(findIdTrackNumber, 'findIdTrackNumber')
        if (findIdTrackNumber < 1) {
            const newIdTrack = new PrescriptionIdTrackModel({
                _id: new mongoose.Types.ObjectId(),
            })

            await newIdTrack.save()
        } else {
        }

        //retrieve id and create patientId
        const findIdTrack = await PrescriptionIdTrackModel.findOne()

        let newPrescriptionNo = findIdTrack.currentNumber + 1
        let desiredPrescriptionNo = newPrescriptionNo
            .toString()
            .padStart(5, '0')
        let prescriptionIds =
            findIdTrack.prescriptionIdentity + desiredPrescriptionNo
        savedPrescription.prescriptionId = prescriptionIds

        await savedPrescription.save()

        findIdTrack.currentNumber = newPrescriptionNo

        await findIdTrack.save()
        io.getIO().emit('update-prescription', {
            actions: 'request-prescription-pull',
            data: getPatient._id,
        })
        res.status(201).json(`prescription created`)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

// edit prescription
exports.editPrescription = async (req, res, next) => {
    try {
        const prescriptionId = req.params.id
        const { drugName, genericName, drugclass, active, prescribed } =
            req.body
        let currentDate = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('DD/MMM/Y')

        const getPrescription = await PrescriptionModel.findById(prescriptionId)

        if (!getPrescription) {
            const error = new Error('Prescription not found')
            error.statusCode = 404
            throw error
        }

        getPrescription.drugName = drugName
        getPrescription.genericName = genericName
        getPrescription.drugclass = drugclass
        getPrescription.status = active
        getPrescription.prescribed = prescribed

        await getPrescription.save()

        io.getIO().emit('update-prescription', {
            actions: 'request-prescription-pull',
            data: getPrescription.patientUniqueId,
        })

        res.status(201).json(
            `Prescription with ${getPrescription.prescriptionId} updated`
        )
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

exports.createRefill = async (req, res, next) => {
    try {
        const { id } = req.body
        const getPrescription = await PrescriptionModel.findById(id)

        if (!getPrescription) {
            const error = new Error('Prescription not found')
            error.statusCode = 404
            throw error
        }

        let currentDate = Moments(new Date()).tz('Africa/Nairobi')

        let createdMonth = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('MMMM')

        let createdYear = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('YYYY')

        const newRefill = new RefillModel({
            _id: new mongoose.Types.ObjectId(),
            prescriptionUniqueId: getPrescription._id,

            amount: 1,
            patientUniqueId: getPrescription.patientUniqueId,
            createdMonth,
            createdYear,
            createdDate: currentDate,
        })

        let savedRefill = await newRefill.save()
        let newAddition = [
            ...getPrescription.refillRequest,
            { refillId: savedRefill._id },
        ]
        getPrescription.refillRequest = newAddition
        await getPrescription.save()

        io.getIO().emit('update-prescription', {
            actions: 'request-prescription-pull',
            data: getPrescription.patientUniqueId,
        })

        res.status(201).json('Refill Added')
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
/** get all patients */

exports.getAllPatients = async (req, res, next) => {
    try {
        //console.log('all patients')
        const getPatients = await PatientModel.find().sort({ createdAt: -1 })

        res.status(200).json({
            items: getPatients,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** get individual patient */
exports.getIndividualPatient = async (req, res, next) => {
    try {
        const patientId = req.params.id

        const getPatient = await PatientModel.findById(patientId)

        if (!getPatient) {
            const error = new Error('Patient not found')
            error.statusCode = 404
            throw error
        }
        const getVitals = await VitalModel.find({
            patientUniqueId: patientId,
        }).sort({ createdDate: -1 })
        const getPrescriptions = await PrescriptionModel.find({
            patientUniqueId: patientId,
        }).sort({ createdDate: -1 })

        res.status(200).json({
            vitals: getVitals,
            prescription: getPrescriptions,
            patient: getPatient,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

exports.getIndividualVitalSummary = async (req, res, next) => {
    try {
        const patientUniqueId = req.params.id
        const dateType = req.params.type

        //console.log('several types', dateType)

        if (dateType === 'Monthly' || dateType === undefined) {
            const Month = Moments().tz('Africa/Nairobi').format('MMMM')
            const Year = Moments().tz('Africa/Nairobi').format('YYYY')
            /** get previous month */
            const getNumber = Moments().tz('Africa/Nairobi').month()
            const prevNum = getNumber - 1
            const getPrevMonth =
                prevNum !== -1
                    ? Moments()
                          .tz('Africa/Nairobi')
                          .month(prevNum)
                          .format('MMMM')
                    : Moments().tz('Africa/Nairobi').month(11).format('MMMM')

            const getPrevYear =
                prevNum !== -1
                    ? Moments()
                          .tz('Africa/Nairobi')
                          .month(prevNum)
                          .format('YYYY')
                    : Moments().tz('Africa/Nairobi').month(11).format('YYYY')

            // previous calculated month
            const BeforeBF = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: Month,
                creationYear: Year,
                vitalTimelineType: 'Before Breakfast',
            }).countDocuments()
            const BeforeLunch = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: Month,
                creationYear: Year,
                vitalTimelineType: 'Before Lunch',
            }).countDocuments()
            const BeforeDinner = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: Month,
                creationYear: Year,
                vitalTimelineType: 'Before Dinner',
            }).countDocuments()
            const BeforeBedtime = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: Month,
                creationYear: Year,
                vitalTimelineType: 'Before Bedtime',
            }).countDocuments()

            //month before calculated month

            const PreviousBeforeBF = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: getPrevMonth,
                creationYear: getPrevYear,
                vitalTimelineType: 'Before Breakfast',
            }).countDocuments()
            const PreviousBeforeLunch = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: getPrevMonth,
                creationYear: getPrevYear,
                vitalTimelineType: 'Before Lunch',
            }).countDocuments()
            const PreviousBeforeDinner = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: getPrevMonth,
                creationYear: getPrevYear,
                vitalTimelineType: 'Before Dinner',
            }).countDocuments()
            const PreviousBeforeBedtime = await VitalModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: getPrevMonth,
                creationYear: getPrevYear,
                vitalTimelineType: 'Before Bedtime',
            }).countDocuments()

            //before brakfast
            let beforeBF_Percent =
                ((BeforeBF - PreviousBeforeBF) / PreviousBeforeBF) * 100
            //before lunch
            let beforeLunch_Percent =
                ((BeforeLunch - PreviousBeforeLunch) / PreviousBeforeLunch) *
                100
            //before dinner
            let beforeDinner_Percent =
                ((BeforeDinner - PreviousBeforeDinner) / PreviousBeforeDinner) *
                100
            //before bedtime
            let beforeBedtime_Percent =
                ((BeforeBedtime - PreviousBeforeBedtime) /
                    PreviousBeforeBedtime) *
                100

            res.status(200).json({
                beforeBF_Percent: isNaN(beforeBF_Percent)
                    ? 0
                    : beforeBF_Percent.toFixed(0),
                beforeLunch_Percent: isNaN(beforeLunch_Percent)
                    ? 0
                    : beforeLunch_Percent.toFixed(0),
                beforeDinner_Percent: isNaN(beforeDinner_Percent)
                    ? 0
                    : beforeDinner_Percent.toFixed(0),
                beforeBedtime_Percent: isNaN(beforeBedtime_Percent)
                    ? 0
                    : beforeBedtime_Percent.toFixed(0),
                BeforeBF,
                BeforeLunch,
                BeforeDinner,
                BeforeBedtime,
            })
        } else {
            const Date1 = Moments()
                .tz('Africa/Nairobi')
                .subtract(0, 'd')
                .endOf('day')
                .toString()

            const Date7 = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'd')
                .startOf('day')
                .toString()

            const Date8 = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'd')
                .toString()

            const Date14 = Moments()
                .tz('Africa/Nairobi')
                .subtract(13, 'd')
                .toString()

            // previous calculated month
            const BeforeBF = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Breakfast',
                    },
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                ],
            }).countDocuments()
            const BeforeLunch = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Lunch',
                    },
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                ],
            }).countDocuments()
            const BeforeDinner = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Dinner',
                    },
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                ],
            }).countDocuments()
            const BeforeBedtime = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Bedtime',
                    },
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                ],
            }).countDocuments()

            //month before calculated month

            const PreviousBeforeBF = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Breakfast',
                    },
                    {
                        createdDate: {
                            $gte: Date14,
                            $lt: Date8,
                        },
                    },
                ],
            }).countDocuments()
            const PreviousBeforeLunch = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Lunch',
                    },
                    {
                        createdDate: {
                            $gte: Date14,
                            $lt: Date8,
                        },
                    },
                ],
            }).countDocuments()
            const PreviousBeforeDinner = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Dinner',
                    },
                    {
                        createdDate: {
                            $gte: Date14,
                            $lt: Date8,
                        },
                    },
                ],
            }).countDocuments()
            const PreviousBeforeBedtime = await VitalModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },
                    {
                        vitalTimelineType: 'Before Bedtime',
                    },
                    {
                        createdDate: {
                            $gte: Date14,
                            $lt: Date8,
                        },
                    },
                ],
            }).countDocuments()

            //before brakfast
            let beforeBF_Percent =
                ((BeforeBF - PreviousBeforeBF) / PreviousBeforeBF) * 100
            //before lunch
            let beforeLunch_Percent =
                ((BeforeLunch - PreviousBeforeLunch) / PreviousBeforeLunch) *
                100
            //before dinner
            let beforeDinner_Percent =
                ((BeforeDinner - PreviousBeforeDinner) / PreviousBeforeDinner) *
                100
            //before bedtime
            let beforeBedtime_Percent =
                ((BeforeBedtime - PreviousBeforeBedtime) /
                    PreviousBeforeBedtime) *
                100

            res.status(200).json({
                beforeBF_Percent: isNaN(beforeBF_Percent)
                    ? 0
                    : beforeBF_Percent.toFixed(0),
                beforeLunch_Percent: isNaN(beforeLunch_Percent)
                    ? 0
                    : beforeLunch_Percent.toFixed(0),
                beforeDinner_Percent: isNaN(beforeDinner_Percent)
                    ? 0
                    : beforeDinner_Percent.toFixed(0),
                beforeBedtime_Percent: isNaN(beforeBedtime_Percent)
                    ? 0
                    : beforeBedtime_Percent.toFixed(0),
                BeforeBF,
                BeforeLunch,
                BeforeDinner,
                BeforeBedtime,
            })
        }
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

exports.getIndividualPrescriptionSummary = async (req, res, next) => {
    try {
        const patientUniqueId = req.params.id
        const dateType = req.params.type

        if (dateType === 'Monthly' || dateType === undefined) {
            const Month = Moments().tz('Africa/Nairobi').format('MMMM')
            const Year = Moments().tz('Africa/Nairobi').format('YYYY')
            /** get previous month */
            const getNumber = Moments().tz('Africa/Nairobi').month()
            const prevNum = getNumber - 1
            const getPrevMonth =
                prevNum !== -1
                    ? Moments()
                          .tz('Africa/Nairobi')
                          .month(prevNum)
                          .format('MMMM')
                    : Moments().tz('Africa/Nairobi').month(11).format('MMMM')

            const getPrevYear =
                prevNum !== -1
                    ? Moments()
                          .tz('Africa/Nairobi')
                          .month(prevNum)
                          .format('YYYY')
                    : Moments().tz('Africa/Nairobi').month(11).format('YYYY')

            // previous calculated month
            const ActivePrescription = await PrescriptionModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: Month,
                creationYear: Year,
            }).countDocuments()
            const RefillRequests = await RefillModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: Month,
                creationYear: Year,
            }).countDocuments()

            //month before calculated month
            const PreviousActivePrescription = await PrescriptionModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: getPrevMonth,
                creationYear: getPrevYear,
            }).countDocuments()
            const PreviousRefillRequests = await RefillModel.find({
                patientUniqueId: patientUniqueId,
                creationMonth: getPrevMonth,
                creationYear: getPrevYear,
            }).countDocuments()

            //before brakfast
            let activePrescription_Percent =
                ((ActivePrescription - PreviousActivePrescription) /
                    PreviousActivePrescription) *
                100
            //before lunch
            let refillRequests_Percent =
                ((RefillRequests - PreviousRefillRequests) /
                    PreviousRefillRequests) *
                100

            res.status(200).json({
                activePrescription_Percent: isNaN(activePrescription_Percent)
                    ? 0
                    : activePrescription_Percent,
                refillRequests_Percent: isNaN(refillRequests_Percent)
                    ? 0
                    : refillRequests_Percent,

                ActivePrescription,
                RefillRequests,
            })
        } else {
            //console.log('weekly')
            const Date1 = Moments()
                .tz('Africa/Nairobi')
                .subtract(0, 'd')
                .endOf('day')
                .toString()

            const Date7 = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'd')
                .startOf('day')
                .toString()

            const Date8 = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'd')
                .toString()

            const Date14 = Moments()
                .tz('Africa/Nairobi')
                .subtract(13, 'd')
                .toString()

            // previous calculated month
            const ActivePrescription = await PrescriptionModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },

                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                ],
            }).countDocuments()
            const RefillRequests = await RefillModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },

                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                ],
            }).countDocuments()

            //month before calculated month
            const PreviousActivePrescription = await PrescriptionModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },

                    {
                        createdDate: {
                            $gte: Date14,
                            $lt: Date8,
                        },
                    },
                ],
            }).countDocuments()
            const PreviousRefillRequests = await RefillModel.find({
                $and: [
                    {
                        patientUniqueId: patientUniqueId,
                    },

                    {
                        createdDate: {
                            $gte: Date14,
                            $lt: Date8,
                        },
                    },
                ],
            }).countDocuments()

            //before brakfast
            let activePrescription_Percent =
                ((ActivePrescription - PreviousActivePrescription) /
                    PreviousActivePrescription) *
                100
            //before lunch
            let refillRequests_Percent =
                ((RefillRequests - PreviousRefillRequests) /
                    PreviousRefillRequests) *
                100

            res.status(200).json({
                activePrescription_Percent: isNaN(activePrescription_Percent)
                    ? 0
                    : activePrescription_Percent.toFixed(0),
                refillRequests_Percent: isNaN(refillRequests_Percent)
                    ? 0
                    : refillRequests_Percent.toFixed(0),

                ActivePrescription,
                RefillRequests,
            })
        }
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/*get all blood pressure vitals*/
exports.getAllBPVitals = async (req, res, next) => {
    try {
        //console.log('Bp-vitals')
        const getBPVitals = await VitalModel.find({
            healthType: 'Blood Pressure',
        })
            .populate('patientUniqueId')
            .sort({ createdDate: -1 })

        res.status(200).json({
            items: getBPVitals,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/*get all blood sugar vitals*/
exports.getAllBSVitals = async (req, res, next) => {
    try {
        //console.log('Bs-vitals')
        const getBSVitals = await VitalModel.find({
            healthType: 'Blood Glucose',
        })
            .populate('patientUniqueId')
            .sort({ createdDate: -1 })

        res.status(200).json({
            items: getBSVitals,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/*get all Fitness Activities vitals*/
exports.getAllFAVitals = async (req, res, next) => {
    try {
       // console.log('fa-vitals')
        const getFAVitals = await VitalModel.find({
            healthType: 'Fitness Activities',
        })
            .populate('patientUniqueId')
            .sort({ createdDate: -1 })

        // console.log('fitness', getFAVitals)
        res.status(200).json({
            items: getFAVitals,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/*get all emergency lists vitals*/
exports.getAllEListVitals = async (req, res, next) => {
    try {
        //console.log('E-lists-vitals')
        const getEListVitals = await VitalModel.find({
            status: { $in: ['critical low', 'critical high', 'high', 'low'] },
        })
            .populate('patientUniqueId')
            .sort({ createdDate: -1 })

        res.status(200).json({
            items: getEListVitals,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** main healt vitals */
//recent general vitals
exports.getGeneralVitals = async (req, res, next) => {
    try {
        const getVitals = await VitalModel.find()
            .populate('patientUniqueId')
            .sort({ createdDate: -1 })

        res.status(200).json({
            allvitals: getVitals,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

//main health vital summary for last 7 days
exports.getGeneralVitalSummary = async (req, res, next) => {
    try {
        //last 7 days
        const Date1 = Moments()
            .tz('Africa/Nairobi')
            .subtract(0, 'd')
            .format('DD-MM-YYYY')
            .toString()
        const Date2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(1, 'd')
            .format('DD-MM-YYYY')
            .toString()
        const Date3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(2, 'd')
            .format('DD-MM-YYYY')
        const Date4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(3, 'd')
            .format('DD-MM-YYYY')
        const Date5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(4, 'd')
            .format('DD-MM-YYYY')
        const Date6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(5, 'd')
            .format('DD-MM-YYYY')
        const Date7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(6, 'd')
            .format('DD-MM-YYYY')

        const prevDates1 = Moments()
            .tz('Africa/Nairobi')
            .subtract(7, 'd')
            .format('DD-MM-YYYY')
        const prevDates2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(8, 'd')
            .format('DD-MM-YYYY')
        const prevDates3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(9, 'd')
            .format('DD-MM-YYYY')
        const prevDates4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(10, 'd')
            .format('DD-MM-YYYY')
        const prevDates5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(11, 'd')
            .format('DD-MM-YYYY')
        const prevDates6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(12, 'd')
            .format('DD-MM-YYYY')
        const prevDates7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(13, 'd')
            .format('DD-MM-YYYY')

        // previous calculated month
        const BeforeBF = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Breakfast',
                },
                {
                    creationDateFormat: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
            ],
        }).countDocuments()

        //console.log('alll test', BeforeBF, Date1, Date7)

        const BeforeLunch = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Lunch',
                },
                {
                    creationDateFormat: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
            ],
        }).countDocuments()
        const BeforeDinner = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Dinner',
                },
                {
                    creationDateFormat: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
            ],
        }).countDocuments()
        const BeforeBedtime = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Bedtime',
                },
                {
                    creationDateFormat: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
            ],
        }).countDocuments()

        //month before calculated month

        const PreviousBeforeBF = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Breakfast',
                },
                {
                    creationDateFormat: {
                        $in: [
                            prevDates1,
                            prevDates2,
                            prevDates3,
                            prevDates4,
                            prevDates5,
                            prevDates6,
                            prevDates7,
                        ],
                    },
                },
            ],
        }).countDocuments()
        const PreviousBeforeLunch = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Lunch',
                },
                {
                    creationDateFormat: {
                        $in: [
                            prevDates1,
                            prevDates2,
                            prevDates3,
                            prevDates4,
                            prevDates5,
                            prevDates6,
                            prevDates7,
                        ],
                    },
                },
            ],
        }).countDocuments()
        const PreviousBeforeDinner = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Dinner',
                },
                {
                    creationDateFormat: {
                        $in: [
                            prevDates1,
                            prevDates2,
                            prevDates3,
                            prevDates4,
                            prevDates5,
                            prevDates6,
                            prevDates7,
                        ],
                    },
                },
            ],
        }).countDocuments()
        const PreviousBeforeBedtime = await VitalModel.find({
            $and: [
                {
                    vitalTimelineType: 'Before Bedtime',
                },
                {
                    creationDateFormat: {
                        $in: [
                            prevDates1,
                            prevDates2,
                            prevDates3,
                            prevDates4,
                            prevDates5,
                            prevDates6,
                            prevDates7,
                        ],
                    },
                },
            ],
        }).countDocuments()

        //before brakfast
        let beforeBF_Percent =
            ((BeforeBF - PreviousBeforeBF) / PreviousBeforeBF) * 100
        //before lunch
        let beforeLunch_Percent =
            ((BeforeLunch - PreviousBeforeLunch) / PreviousBeforeLunch) * 100
        //before dinner
        let beforeDinner_Percent =
            ((BeforeDinner - PreviousBeforeDinner) / PreviousBeforeDinner) * 100
        //before bedtime
        let beforeBedtime_Percent =
            ((BeforeBedtime - PreviousBeforeBedtime) / PreviousBeforeBedtime) *
            100

        res.status(200).json({
            beforeBF_Percent: isNaN(beforeBF_Percent)
                ? 0
                : beforeBF_Percent.toFixed(0),
            beforeLunch_Percent: isNaN(beforeLunch_Percent)
                ? 0
                : beforeLunch_Percent.toFixed(0),
            beforeDinner_Percent: isNaN(beforeDinner_Percent)
                ? 0
                : beforeDinner_Percent.toFixed(0),
            beforeBedtime_Percent: isNaN(beforeBedtime_Percent)
                ? 0
                : beforeBedtime_Percent.toFixed(0),
            BeforeBF,
            BeforeLunch,
            BeforeDinner,
            BeforeBedtime,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

//main health vital summary for last months
//before breakfast
exports.getVitalsMonthSummary = async (req, res, next) => {
    try {
        const vitalType = req.params.type
        //console.log('viit', vitalType)
        const currentMonth = Moments().tz('Africa/Nairobi').format('MMMM')
        const currentYear = Moments().tz('Africa/Nairobi').format('YYYY')
        let beforeBFStats = []
        //console.log('month', currentMonth)
        if (currentMonth.toLowerCase() === 'january') {
            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
            ]
        }

        //feb

        if (currentMonth.toLowerCase() === 'february') {
            let previousMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let previousYear = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('YYYY')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },

                    {
                        creationMonth: previousMonth,
                    },

                    {
                        creationYear: previousYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: previousYear,
                    },
                ],
            }).countDocuments()
            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
            ]
        }

        //Mar
        if (currentMonth.toLowerCase() === 'march') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')

            let janYear = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('YYYY')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let febYear = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('YYYY')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: janYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: febYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
            ]
        }

        //April
        if (currentMonth.toLowerCase() === 'april') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
            ]
        }

        //May
        if (currentMonth.toLowerCase() === 'may') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
            ]
        }

        //Jun
        if (currentMonth.toLowerCase() === 'june') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
            ]
        }
        //July
        if (currentMonth.toLowerCase() === 'july') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let JunMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JunMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
                {
                    x: 'Jul',
                    y: JulBeforeBF,
                },
            ]
        }

        //Aug
        if (currentMonth.toLowerCase() === 'august') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let JunMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let JulMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JunMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JulMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
                {
                    x: 'Jul',
                    y: JulBeforeBF,
                },
                {
                    x: 'Aug',
                    y: AugBeforeBF,
                },
            ]
        }

        //Sept
        if (currentMonth.toLowerCase() === 'september') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(8, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let JunMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let JulMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let AugMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JunMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                        creationMonth: JulMonth,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AugMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
                {
                    x: 'Jul',
                    y: JulBeforeBF,
                },
                {
                    x: 'Aug',
                    y: AugBeforeBF,
                },
                {
                    x: 'Sep',
                    y: SepBeforeBF,
                },
            ]
        }

        //Oct
        if (currentMonth.toLowerCase() === 'october') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(9, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(8, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')
            let JunMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let JulMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let AugMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let SepMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JunMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JulMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AugMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: SepMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let OctBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
                {
                    x: 'Jul',
                    y: JulBeforeBF,
                },
                {
                    x: 'Aug',
                    y: AugBeforeBF,
                },
                {
                    x: 'Sep',
                    y: SepBeforeBF,
                },
                {
                    x: 'Oct',
                    y: OctBeforeBF,
                },
            ]
        }

        //Nov
        if (currentMonth.toLowerCase() === 'november') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(10, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(9, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(8, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'M')
                .format('MMMM')
            let JunMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')
            let JulMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let AugMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let SepMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let OctMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JunMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JulMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AugMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: SepMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let OctBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: OctMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let NovBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
                {
                    x: 'Jul',
                    y: JulBeforeBF,
                },
                {
                    x: 'Aug',
                    y: AugBeforeBF,
                },
                {
                    x: 'Sep',
                    y: SepBeforeBF,
                },
                {
                    x: 'Oct',
                    y: OctBeforeBF,
                },
                {
                    x: 'Nov',
                    y: NovBeforeBF,
                },
            ]
        }

        //Dec
        if (currentMonth.toLowerCase() === 'december') {
            let janMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(11, 'M')
                .format('MMMM')

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(10, 'M')
                .format('MMMM')
            let MarMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(9, 'M')
                .format('MMMM')
            let AprMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(8, 'M')
                .format('MMMM')
            let MayMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(7, 'M')
                .format('MMMM')
            let JunMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'M')
                .format('MMMM')
            let JulMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'M')
                .format('MMMM')
            let AugMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'M')
                .format('MMMM')
            let SepMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'M')
                .format('MMMM')
            let OctMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'M')
                .format('MMMM')
            let NovMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: janMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: febMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MarMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AprMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: MayMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JunMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: JulMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: AugMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: SepMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let OctBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: OctMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let NovBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: NovMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            let DecBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: vitalType,
                    },
                    {
                        creationMonth: currentMonth,
                    },

                    {
                        creationYear: currentYear,
                    },
                ],
            }).countDocuments()
            beforeBFStats = [
                {
                    x: 'Jan',
                    y: JanBeforeBF,
                },
                {
                    x: 'Feb',
                    y: FebBeforeBF,
                },
                {
                    x: 'Mar',
                    y: MarBeforeBF,
                },
                {
                    x: 'Apr',
                    y: ApriBeforeBF,
                },
                {
                    x: 'May',
                    y: MayBeforeBF,
                },
                {
                    x: 'Jun',
                    y: JunBeforeBF,
                },
                {
                    x: 'Jul',
                    y: JulBeforeBF,
                },
                {
                    x: 'Aug',
                    y: AugBeforeBF,
                },
                {
                    x: 'Sep',
                    y: SepBeforeBF,
                },
                {
                    x: 'Oct',
                    y: OctBeforeBF,
                },
                {
                    x: 'Nov',
                    y: NovBeforeBF,
                },
                {
                    x: 'Dec',
                    y: DecBeforeBF,
                },
            ]
        } else {
        }

        res.status(200).json({
            stats: beforeBFStats,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

//overview dashboard
//summary of details
exports.getDashReportSummary = async (req, res, next) => {
    try {
        //last 7 days
        const Date1 = Moments()
            .tz('Africa/Nairobi')
            .subtract(0, 'd')
            .format('DD/MMM/YYYY')
        const Date2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(1, 'd')
            .format('DD/MMM/YYYY')
        const Date3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(2, 'd')
            .format('DD/MMM/YYYY')
        const Date4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(3, 'd')
            .format('DD/MMM/YYYY')
        const Date5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(4, 'd')
            .format('DD/MMM/YYYY')
        const Date6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(5, 'd')
            .format('DD/MMM/YYYY')
        const Date7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(6, 'd')
            .format('DD/MMM/YYYY')

        // total patients
        const Patients = await PatientModel.find({
            $and: [
                {
                    dateJoined: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
            ],
        }).countDocuments()

        const RDate1 = Moments()
            .tz('Africa/Nairobi')
            .subtract(0, 'd')
            .format('DD-MM-YYYY')
        const RDate2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(1, 'd')
            .format('DD-MM-YYYY')
        const RDate3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(2, 'd')
            .format('DD-MM-YYYY')
        const RDate4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(3, 'd')
            .format('DD-MM-YYYY')
        const RDate5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(4, 'd')
            .format('DD-MM-YYYY')
        const RDate6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(5, 'd')
            .format('DD-MM-YYYY')
        const RDate7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(6, 'd')
            .format('DD-MM-YYYY')

        //total blood reports
        const BloodReports = await VitalModel.find({
            $and: [
                {
                    creationDateFormat: {
                        $in: [
                            RDate1,
                            RDate2,
                            RDate3,
                            RDate4,
                            RDate5,
                            RDate6,
                            RDate7,
                        ],
                    },
                },
                {
                    healthType: {
                        $in: ['Blood Pressure', 'Blood Glucose'],
                    },
                },
            ],
        }).countDocuments()

        //fitness reports
        const FitnessReports = await VitalModel.find({
            $and: [
                {
                    creationDateFormat: {
                        $in: [
                            RDate1,
                            RDate2,
                            RDate3,
                            RDate4,
                            RDate5,
                            RDate6,
                            RDate7,
                        ],
                    },
                },
                {
                    healthType: {
                        $in: ['Fitness Activities'],
                    },
                },
            ],
        }).countDocuments()

        //emergency lists
        const EmergencyList = await VitalModel.find({
            $and: [
                {
                    creationDateFormat: {
                        $in: [
                            RDate1,
                            RDate2,
                            RDate3,
                            RDate4,
                            RDate5,
                            RDate6,
                            RDate7,
                        ],
                    },
                },
                {
                    status: {
                        $in: ['critical low', 'critical high', 'high', 'low'],
                    },
                },
            ],
        }).countDocuments()

        res.status(200).json({
            Patients: isNaN(Patients) ? 0 : Patients,
            BloodReports: isNaN(BloodReports) ? 0 : BloodReports,
            FitnessReports: isNaN(FitnessReports) ? 0 : FitnessReports,
            EmergencyList: isNaN(EmergencyList) ? 0 : EmergencyList,
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** health vitals graph detials */
exports.getDashPieGraphSummary = async (req, res, next) => {
    try {
        const datesTypes = req.params.type
        //console.log('type', datesTypes)
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')
        const Year = Moments().tz('Africa/Nairobi').format('YYYY')
        // console.log('year', Year, Month)
        if (datesTypes === 'Monthly' || datesTypes === undefined) {
            //total blood Pressure reports
            const BloodPressureReports = await VitalModel.find({
                $and: [
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
                        healthType: {
                            $in: ['Blood Pressure'],
                        },
                    },
                ],
            }).countDocuments()

            //total blood Pressure reports
            const BloodSugarReports = await VitalModel.find({
                $and: [
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
                        healthType: {
                            $in: ['Blood Glucose'],
                        },
                    },
                ],
            }).countDocuments()

            //fitness reports
            const FitnessReports = await VitalModel.find({
                $and: [
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
                        healthType: {
                            $in: ['Fitness Activities'],
                        },
                    },
                ],
            }).countDocuments()
            let overallTotal =
                FitnessReports + BloodSugarReports + BloodPressureReports
            let bpPercent = (BloodPressureReports / overallTotal) * 100
            let bsPercent = (BloodSugarReports / overallTotal) * 100
            let faPercent = (FitnessReports / overallTotal) * 100

            res.status(200).json({
                reports: [
                    {
                        x: 'Blood Pressure',
                        y: isNaN(bpPercent) ? 0 : bpPercent,
                    },
                    {
                        x: 'Blood Sugar',
                        y: isNaN(bsPercent) ? 0 : bsPercent,
                    },
                    {
                        x: 'Fitness',
                        y: isNaN(faPercent) ? 0 : faPercent,
                    },
                ],
                BloodPReports: isNaN(bpPercent) ? 0 : bpPercent.toFixed(2),
                BloodSReports: isNaN(bsPercent) ? 0 : bsPercent.toFixed(2),
                FitnessReports: isNaN(faPercent) ? 0 : faPercent.toFixed(2),
                overallTotal,
            })
        }

        if (datesTypes === 'Weekly') {
            /** this is weekly / last 7 days */
            //console.log('we are on weekly')

            const Date1 = Moments()
                .tz('Africa/Nairobi')
                .subtract(0, 'd')
                .endOf('day')
                .toString()

            const Date7 = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'd')
                .startOf('day')
                .toString()
            // console.log('start of the 7 days', Date7)
            // console.log('end of the 7 days', Date1)
            //total blood Pressure reports
            const BloodPressureReports = await VitalModel.find({
                $and: [
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                    {
                        healthType: {
                            $in: ['Blood Pressure'],
                        },
                    },
                ],
            }).countDocuments()

            //console.log('Blood reports', BloodPressureReports)

            //total blood Pressure reports
            const BloodSugarReports = await VitalModel.find({
                $and: [
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                    {
                        healthType: {
                            $in: ['Blood Glucose'],
                        },
                    },
                ],
            }).countDocuments()

            //fitness reports
            const FitnessReports = await VitalModel.find({
                $and: [
                    {
                        createdDate: {
                            $gte: Date7,
                            $lt: Date1,
                        },
                    },
                    {
                        healthType: {
                            $in: ['Fitness Activities'],
                        },
                    },
                ],
            }).countDocuments()
            let overallTotal =
                FitnessReports + BloodSugarReports + BloodPressureReports
            let bpPercent = (BloodPressureReports / overallTotal) * 100
            let bsPercent = (BloodSugarReports / overallTotal) * 100
            let faPercent = (FitnessReports / overallTotal) * 100

            res.status(200).json({
                reports: [
                    {
                        x: 'Blood Pressure',
                        y: isNaN(bpPercent) ? 0 : bpPercent,
                    },
                    {
                        x: 'Blood Sugar',
                        y: isNaN(bsPercent) ? 0 : bsPercent,
                    },
                    {
                        x: 'Fitness',
                        y: isNaN(faPercent) ? 0 : faPercent,
                    },
                ],
                BloodPReports: isNaN(bpPercent) ? 0 : bpPercent.toFixed(2),
                BloodSReports: isNaN(bsPercent) ? 0 : bsPercent.toFixed(2),
                FitnessReports: isNaN(faPercent) ? 0 : faPercent.toFixed(2),
                overallTotal,
            })
        }
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}

/** average new patients graph */
exports.getDashBarGraphSummary = async (req, res, next) => {
    try {
        const datesTypes = req.params.type
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')
        const Year = Moments().tz('Africa/Nairobi').format('YYYY')
        const getNumber = Moments().tz('Africa/Nairobi').month()
        const prevNum = getNumber - 1
        const getPrevMonth =
            prevNum !== -1
                ? Moments().tz('Africa/Nairobi').month(prevNum).format('MMMM')
                : Moments().tz('Africa/Nairobi').month(11).format('MMMM')
        const PrevYear =
            prevNum !== -1
                ? Moments().tz('Africa/Nairobi').month(prevNum).format('YYYY')
                : Moments().tz('Africa/Nairobi').month(11).format('YYYY')
        //console.log('PrevYear', PrevYear, getPrevMonth)

        const CurrentPatientReports = await PatientModel.find({
            $and: [
                {
                    joinedMonth: {
                        $in: [Month],
                    },
                },
                {
                    joinedYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const PreviousPatientReports = await PatientModel.find({
            $and: [
                {
                    joinedMonth: {
                        $in: [getPrevMonth],
                    },
                },
                {
                    joinedYear: {
                        $in: [PrevYear],
                    },
                },
            ],
        }).countDocuments()

        //stats difference
        let PatientPercent =
            ((CurrentPatientReports - PreviousPatientReports) /
                PreviousPatientReports) *
            100

        /** all year round stats */

        if (datesTypes === 'Monthly') {
            const JanPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['January'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const FebPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['February'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const MarPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['March'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const AprPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['April'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const MayPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['May'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const JunPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['June'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const JulPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['July'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const AugPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['August'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const SeptPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['September'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const OctPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['October'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const NovPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['November'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            const DecPatientReports = await PatientModel.find({
                $and: [
                    {
                        joinedMonth: {
                            $in: ['December'],
                        },
                    },
                    {
                        joinedYear: {
                            $in: [Year],
                        },
                    },
                ],
            }).countDocuments()

            res.status(200).json({
                reports: [
                    {
                        x: 'Jan',
                        y: isNaN(JanPatientReports) ? 0 : JanPatientReports,
                    },
                    {
                        x: 'Feb',
                        y: isNaN(FebPatientReports) ? 0 : FebPatientReports,
                    },
                    {
                        x: 'Mar',
                        y: isNaN(MarPatientReports) ? 0 : MarPatientReports,
                    },
                    {
                        x: 'Apri',
                        y: isNaN(AprPatientReports) ? 0 : AprPatientReports,
                    },
                    {
                        x: 'May',
                        y: isNaN(MayPatientReports) ? 0 : MayPatientReports,
                    },
                    {
                        x: 'Jun',
                        y: isNaN(JunPatientReports) ? 0 : JunPatientReports,
                    },
                    {
                        x: 'Jul',
                        y: isNaN(JulPatientReports) ? 0 : JulPatientReports,
                    },
                    {
                        x: 'Aug',
                        y: isNaN(AugPatientReports) ? 0 : AugPatientReports,
                    },
                    {
                        x: 'Sept',
                        y: isNaN(SeptPatientReports) ? 0 : SeptPatientReports,
                    },
                    {
                        x: 'Oct',
                        y: isNaN(OctPatientReports) ? 0 : OctPatientReports,
                    },
                    {
                        x: 'Nov',
                        y: isNaN(NovPatientReports) ? 0 : NovPatientReports,
                    },
                    {
                        x: 'Dec',
                        y: isNaN(DecPatientReports) ? 0 : DecPatientReports,
                    },
                ],
                CurrentTotal: isNaN(CurrentPatientReports)
                    ? 0
                    : CurrentPatientReports,
                PatientPercent:
                    isNaN(PatientPercent) || PatientPercent == 'Infinity'
                        ? 0
                        : PatientPercent,
            })
        } else {
            // console.log('weekly')
            const StartOfDate1 = Moments()
                .tz('Africa/Nairobi')
                .subtract(0, 'd')
                .toString()
            const EndOfDate1 = Moments()
                .tz('Africa/Nairobi')
                .subtract(0, 'd')
                .toString()

            const StartOfDate2 = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'd')
                .toString()
            const EndOfDate2 = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'd')
                .toString()

            const StartOfDate3 = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'd')
                .toString()
            const EndOfDate3 = Moments()
                .tz('Africa/Nairobi')
                .subtract(2, 'd')
                .toString()

            const StartOfDate4 = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'd')
                .toString()
            const EndOfDate4 = Moments()
                .tz('Africa/Nairobi')
                .subtract(3, 'd')
                .toString()

            const StartOfDate5 = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'd')
                .toString()
            const EndOfDate5 = Moments()
                .tz('Africa/Nairobi')
                .subtract(4, 'd')
                .toString()

            const StartOfDate6 = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'd')
                .toString()
            const EndOfDate6 = Moments()
                .tz('Africa/Nairobi')
                .subtract(5, 'd')
                .toString()

            const StartOfDate7 = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'd')
                .toString()
            const EndOfDate7 = Moments()
                .tz('Africa/Nairobi')
                .subtract(6, 'd')
                .toString()
            const Day1Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate1,
                            $lt: EndOfDate1,
                        },
                    },
                ],
            }).countDocuments()

            const Day2Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate2,
                            $lt: EndOfDate2,
                        },
                    },
                ],
            }).countDocuments()

            const Day3Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate3,
                            $lt: EndOfDate3,
                        },
                    },
                ],
            }).countDocuments()

            const Day4Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate4,
                            $lt: EndOfDate4,
                        },
                    },
                ],
            }).countDocuments()

            const Day5Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate5,
                            $lt: EndOfDate5,
                        },
                    },
                ],
            }).countDocuments()

            const Day6Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate6,
                            $lt: EndOfDate6,
                        },
                    },
                ],
            }).countDocuments()

            const Day7Reports = await PatientModel.find({
                $and: [
                    {
                        dateJoined: {
                            $gte: StartOfDate7,
                            $lt: EndOfDate7,
                        },
                    },
                ],
            }).countDocuments()

            res.status(200).json({
                reports: [
                    {
                        x: Moments(new Date(StartOfDate7))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day7Reports) ? 0 : Day7Reports,
                    },
                    {
                        x: Moments(new Date(StartOfDate6))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day6Reports) ? 0 : Day6Reports,
                    },
                    {
                        x: Moments(new Date(StartOfDate5))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day5Reports) ? 0 : Day5Reports,
                    },
                    {
                        x: Moments(new Date(StartOfDate4))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day4Reports) ? 0 : Day4Reports,
                    },
                    {
                        x: Moments(new Date(StartOfDate3))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day3Reports) ? 0 : Day3Reports,
                    },
                    {
                        x: Moments(new Date(StartOfDate2))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day2Reports) ? 0 : Day2Reports,
                    },
                    {
                        x: Moments(new Date(StartOfDate1))
                            .tz('Africa/Nairobi')
                            .format('DD-MMM'),
                        y: isNaN(Day1Reports) ? 0 : Day1Reports,
                    },
                ],
                CurrentTotal: isNaN(CurrentPatientReports)
                    ? 0
                    : CurrentPatientReports,
                PatientPercent:
                    isNaN(PatientPercent) || PatientPercent == 'Infinity'
                        ? 0
                        : PatientPercent,
            })
        }
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
