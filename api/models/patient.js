const mongoose = require('mongoose')

const patientSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        patientId: {
            type: String,
        },
        patientName: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        password: {
            type: String,
        },
        unVerifiedPassword: {
            type: String,
        },
        onBoardInfo: {
            type: Boolean,
            default: false,
        },
        birthday: {
            type: String,
            required: true,
        },
        platform: {
            type: String,
            required: true,
            default: 'N/A',
        },
        height: {
            type: String,

            default: '',
        },
        weight: {
            type: String,

            default: '',
        },
        dateJoined: {
            type: String,
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        verificationToken: String,
        resetAllowed: { type: Boolean, default: false },
        createdMonth: String,
        createdYear: String,
        createdDate: String,
    },
    { timestamps: true }
)

module.exports = mongoose.model('patients', patientSchema)
