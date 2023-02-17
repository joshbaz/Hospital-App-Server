const PatientModel = require('../models/patient')
const IdTrackModel = require('../models/IdTracking')
const PrescriptionIdTrackModel = require('../models/idTrackPrescription')
const PrescriptionModel = require('../models/prescription')
const RefillModel = require('../models/refillRequest')
const VitalModel = require('../models/vital')
const mongoose = require('mongoose')
const Moments = require('moment-timezone')

exports.createPatient = async (req, res, next) => {
    try {
        const { patientName, phoneNumber, birthday } = req.body
        let currentDate = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('DD/MMM/Y')

        const newPatient = new PatientModel({
            _id: new mongoose.Types.ObjectId(),
            patientName,
            phoneNumber,
            birthday,
            dateJoined: currentDate,
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

        res.status(201).json(`New Patient with id-${patientIds} created`)
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
        const { drugName, genericName, drugclass, active } = req.body
        let currentDate = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('DD/MMM/Y')

        let createdMonth = Moments(new Date())
            .tz('Africa/Nairobi')
            .format('MMMM')
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
            patientUniqueId: patientId,
            createdMonth,
            lastPrescribed: currentDate,
            status: active,
        })

        let savedPrescription = await newPrescription.save()

        //create the new Patient Id
        const findIdTrackNumber =
            await PrescriptionIdTrackModel.find().countDocuments()
        console.log(findIdTrackNumber, 'findIdTrackNumber')
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

        res.status(201).json(`New Patient with id-${prescriptionIds} created`)
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
        const { drugName, genericName, drugclass, active } = req.body
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

        await getPrescription.save()

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

/** get all patients */

exports.getAllPatients = async (req, res, next) => {
    try {
        const getPatients = await PatientModel.find()

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
        const getVitals = await VitalModel.find({ patientUniqueId: patientId })
        const getPrescriptions = await PrescriptionModel.find({
            patientUniqueId: patientId,
        })

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
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')

        /** get previous month */
        const getNumber = Moments().tz('Africa/Nairobi').month()
        const prevNum = getNumber - 1
        const getPrevMonth =
            prevNum !== -1
                ? Moments().tz('Africa/Nairobi').month(prevNum).format('MMMM')
                : Moments().tz('Africa/Nairobi').month(11).format('MMMM')

        // previous calculated month
        const BeforeBF = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: Month,
            vitalTimelineType: 'Before Breakfast',
        }).countDocuments()
        const BeforeLunch = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: Month,
            vitalTimelineType: 'Before Lunch',
        }).countDocuments()
        const BeforeDinner = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: Month,
            vitalTimelineType: 'Before Dinner',
        }).countDocuments()
        const BeforeBedtime = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: Month,
            vitalTimelineType: 'Before Bedtime',
        }).countDocuments()

        //month before calculated month

        const PreviousBeforeBF = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: getPrevMonth,
            vitalTimelineType: 'Before Breakfast',
        }).countDocuments()
        const PreviousBeforeLunch = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: getPrevMonth,
            vitalTimelineType: 'Before Lunch',
        }).countDocuments()
        const PreviousBeforeDinner = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: getPrevMonth,
            vitalTimelineType: 'Before Dinner',
        }).countDocuments()
        const PreviousBeforeBedtime = await VitalModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: getPrevMonth,
            vitalTimelineType: 'Before Bedtime',
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
            beforeBF_Percent: isNaN(beforeBF_Percent) ? 0 : beforeBF_Percent,
            beforeLunch_Percent: isNaN(beforeLunch_Percent)
                ? 0
                : beforeLunch_Percent,
            beforeDinner_Percent: isNaN(beforeDinner_Percent)
                ? 0
                : beforeDinner_Percent,
            beforeBedtime_Percent: isNaN(beforeBedtime_Percent)
                ? 0
                : beforeBedtime_Percent,
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

exports.getIndividualPrescriptionSummary = async (req, res, next) => {
    try {
        const patientUniqueId = req.params.id
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')

        /** get previous month */
        const getNumber = Moments().tz('Africa/Nairobi').month()
        const prevNum = getNumber - 1
        const getPrevMonth =
            prevNum !== -1
                ? Moments().tz('Africa/Nairobi').month(prevNum).format('MMMM')
                : Moments().tz('Africa/Nairobi').month(11).format('MMMM')

        // previous calculated month
        const ActivePrescription = await PrescriptionModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: Month,
        }).countDocuments()
        const RefillRequests = await RefillModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: Month,
        }).countDocuments()

        //month before calculated month
        const PreviousActivePrescription = await PrescriptionModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: getPrevMonth,
        }).countDocuments()
        const PreviousRefillRequests = await RefillModel.find({
            patientUniqueId: patientUniqueId,
            creationMonth: getPrevMonth,
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
        const getBPVitals = await VitalModel.find({
            healthType: 'Blood Pressure',
        }).populate('patientUniqueId')

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
        const getBSVitals = await VitalModel.find({
            healthType: 'Blood Sugar',
        }).populate('patientUniqueId')

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
        const getFAVitals = await VitalModel.find({
            healthType: 'Fitness Activities',
        }).populate('patientUniqueId')

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
        const getEListVitals = await VitalModel.find({
            status: 'critical Low',
        }).populate('patientUniqueId')

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
        const getVitals = await VitalModel.find().populate('patientUniqueId')

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
            .subtract(1, 'd')
            .format('DD-MM-YY')
        const Date2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(2, 'd')
            .format('DD-MM-YY')
        const Date3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(3, 'd')
            .format('DD-MM-YY')
        const Date4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(4, 'd')
            .format('DD-MM-YY')
        const Date5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(5, 'd')
            .format('DD-MM-YY')
        const Date6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(6, 'd')
            .format('DD-MM-YY')
        const Date7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(7, 'd')
            .format('DD-MM-YY')

        const prevDates1 = Moments()
            .tz('Africa/Nairobi')
            .subtract(8, 'd')
            .format('DD-MM-YY')
        const prevDates2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(9, 'd')
            .format('DD-MM-YY')
        const prevDates3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(10, 'd')
            .format('DD-MM-YY')
        const prevDates4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(11, 'd')
            .format('DD-MM-YY')
        const prevDates5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(12, 'd')
            .format('DD-MM-YY')
        const prevDates6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(13, 'd')
            .format('DD-MM-YY')
        const prevDates7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(14, 'd')
            .format('DD-MM-YY')

        // previous calculated month
        const BeforeBF = await VitalModel.find({
            $or: [
                { createdDate: Date1 },
                { createdDate: Date2 },
                { createdDate: Date3 },
                { createdDate: Date4 },
                { createdDate: Date5 },
                { createdDate: Date6 },
                { createdDate: Date7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Breakfast',
                },
            ],
        }).countDocuments()

        const BeforeLunch = await VitalModel.find({
            $or: [
                { createdDate: Date1 },
                { createdDate: Date2 },
                { createdDate: Date3 },
                { createdDate: Date4 },
                { createdDate: Date5 },
                { createdDate: Date6 },
                { createdDate: Date7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Lunch',
                },
            ],
        }).countDocuments()
        const BeforeDinner = await VitalModel.find({
            $or: [
                { createdDate: Date1 },
                { createdDate: Date2 },
                { createdDate: Date3 },
                { createdDate: Date4 },
                { createdDate: Date5 },
                { createdDate: Date6 },
                { createdDate: Date7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Dinner',
                },
            ],
        }).countDocuments()
        const BeforeBedtime = await VitalModel.find({
            $or: [
                { createdDate: Date1 },
                { createdDate: Date2 },
                { createdDate: Date3 },
                { createdDate: Date4 },
                { createdDate: Date5 },
                { createdDate: Date6 },
                { createdDate: Date7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Bedtime',
                },
            ],
        }).countDocuments()

        //month before calculated month

        const PreviousBeforeBF = await VitalModel.find({
            $or: [
                { createdDate: prevDates1 },
                { createdDate: prevDates2 },
                { createdDate: prevDates3 },
                { createdDate: prevDates4 },
                { createdDate: prevDates5 },
                { createdDate: prevDates6 },
                { createdDate: prevDates7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Breakfast',
                },
            ],
        }).countDocuments()
        const PreviousBeforeLunch = await VitalModel.find({
            $or: [
                { createdDate: prevDates1 },
                { createdDate: prevDates2 },
                { createdDate: prevDates3 },
                { createdDate: prevDates4 },
                { createdDate: prevDates5 },
                { createdDate: prevDates6 },
                { createdDate: prevDates7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Lunch',
                },
            ],
        }).countDocuments()
        const PreviousBeforeDinner = await VitalModel.find({
            $or: [
                { createdDate: prevDates1 },
                { createdDate: prevDates2 },
                { createdDate: prevDates3 },
                { createdDate: prevDates4 },
                { createdDate: prevDates5 },
                { createdDate: prevDates6 },
                { createdDate: prevDates7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Dinner',
                },
            ],
        }).countDocuments()
        const PreviousBeforeBedtime = await VitalModel.find({
            $or: [
                { createdDate: prevDates1 },
                { createdDate: prevDates2 },
                { createdDate: prevDates3 },
                { createdDate: prevDates4 },
                { createdDate: prevDates5 },
                { createdDate: prevDates6 },
                { createdDate: prevDates7 },
            ],
            $and: [
                {
                    vitalTimelineType: 'Before Bedtime',
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
            beforeBF_Percent: isNaN(beforeBF_Percent) ? 0 : beforeBF_Percent,
            beforeLunch_Percent: isNaN(beforeLunch_Percent)
                ? 0
                : beforeLunch_Percent,
            beforeDinner_Percent: isNaN(beforeDinner_Percent)
                ? 0
                : beforeDinner_Percent,
            beforeBedtime_Percent: isNaN(beforeBedtime_Percent)
                ? 0
                : beforeBedtime_Percent,
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
        const currentMonth = Moments().tz('Africa/Nairobi').format('MMMM')
        let beforeBFStats = []
        //console.log('month', currentMonth)
        if (currentMonth.toLowerCase() === 'january') {
            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: previousMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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

            let febMonth = Moments()
                .tz('Africa/Nairobi')
                .subtract(1, 'M')
                .format('MMMM')

            let JanBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JunMonth,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JunMonth,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JulMonth,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JunMonth,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JulMonth,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AugMonth,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JunMonth,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JulMonth,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AugMonth,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: SepMonth,
                    },
                ],
            }).countDocuments()
            let OctBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JunMonth,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JulMonth,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AugMonth,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: SepMonth,
                    },
                ],
            }).countDocuments()
            let OctBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: OctMonth,
                    },
                ],
            }).countDocuments()
            let NovBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: janMonth,
                    },
                ],
            }).countDocuments()

            let FebBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: febMonth,
                    },
                ],
            }).countDocuments()
            let MarBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MarMonth,
                    },
                ],
            }).countDocuments()

            let ApriBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AprMonth,
                    },
                ],
            }).countDocuments()

            let MayBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: MayMonth,
                    },
                ],
            }).countDocuments()
            let JunBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JunMonth,
                    },
                ],
            }).countDocuments()
            let JulBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: JulMonth,
                    },
                ],
            }).countDocuments()
            let AugBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: AugMonth,
                    },
                ],
            }).countDocuments()
            let SepBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: SepMonth,
                    },
                ],
            }).countDocuments()
            let OctBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: OctMonth,
                    },
                ],
            }).countDocuments()
            let NovBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: NovMonth,
                    },
                ],
            }).countDocuments()
            let DecBeforeBF = await VitalModel.find({
                $and: [
                    {
                        vitalTimelineType: 'Before Breakfast',
                        creationMonth: currentMonth,
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
            .subtract(1, 'd')
            .format('DD/MMM/Y')
        const Date2 = Moments()
            .tz('Africa/Nairobi')
            .subtract(2, 'd')
            .format('DD/MMM/Y')
        const Date3 = Moments()
            .tz('Africa/Nairobi')
            .subtract(3, 'd')
            .format('DD/MMM/Y')
        const Date4 = Moments()
            .tz('Africa/Nairobi')
            .subtract(4, 'd')
            .format('DD/MMM/Y')
        const Date5 = Moments()
            .tz('Africa/Nairobi')
            .subtract(5, 'd')
            .format('DD/MMM/Y')
        const Date6 = Moments()
            .tz('Africa/Nairobi')
            .subtract(6, 'd')
            .format('DD/MMM/Y')
        const Date7 = Moments()
            .tz('Africa/Nairobi')
            .subtract(7, 'd')
            .format('DD/MMM/Y')

        // total patients
        const Patients = await PatientModel.find({
            $or: [
                { dateJoined: Date1 },
                { dateJoined: Date2 },
                { dateJoined: Date3 },
                { dateJoined: Date4 },
                { dateJoined: Date5 },
                { dateJoined: Date6 },
                { dateJoined: Date7 },
            ],
        }).countDocuments()

        //total blood reports
        const BloodReports = await VitalModel.find({
            $and: [
                {
                    createdDate: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
                {
                    healthType: {
                        $in: ['Blood Pressure', 'Blood Sugar'],
                    },
                },
            ],
        }).countDocuments()

        //fitness reports
        const FitnessReports = await VitalModel.find({
            $and: [
                {
                    createdDate: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
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
                    createdDate: {
                        $in: [Date1, Date2, Date3, Date4, Date5, Date6, Date7],
                    },
                },
                {
                    status: {
                        $in: ['Critical Low', 'Critical High'],
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
        const Month = Moments().tz('Africa/Nairobi').format('MMMM')
        const Year = Moments().tz('Africa/Nairobi').format('YYYY')
        console.log('year', Year, Month)
        //total blood Pressure reports
        const BloodPressureReports = await VitalModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: [Month],
                    },
                },
                {
                    createdYear: {
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
                    createdMonth: {
                        $in: [Month],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
                {
                    healthType: {
                        $in: ['Blood Sugar'],
                    },
                },
            ],
        }).countDocuments()

        //fitness reports
        const FitnessReports = await VitalModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: [Month],
                    },
                },
                {
                    createdYear: {
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
            BloodPReports: isNaN(bpPercent) ? 0 : bpPercent,
            BloodSReports: isNaN(bsPercent) ? 0 : bsPercent,
            FitnessReports: isNaN(faPercent) ? 0 : faPercent,
            overallTotal,
        })
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
        console.log('PrevYear', PrevYear, getPrevMonth)

        const CurrentPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: [Month],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const PreviousPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: [getPrevMonth],
                    },
                },
                {
                    createdYear: {
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

        const JanPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['January'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const FebPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['February'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const MarPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['March'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const AprPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['April'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const MayPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['May'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const JunPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['June'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const JulPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['July'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const AugPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['August'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const SeptPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['September'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const OctPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['October'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const NovPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['November'],
                    },
                },
                {
                    createdYear: {
                        $in: [Year],
                    },
                },
            ],
        }).countDocuments()

        const DecPatientReports = await PatientModel.find({
            $and: [
                {
                    createdMonth: {
                        $in: ['December'],
                    },
                },
                {
                    createdYear: {
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
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        }
        next(error)
    }
}
