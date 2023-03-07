const mongoose = require('mongoose')
const prescriptionSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,

        patientUniqueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'patients',
        },
        prescriptionId: {
            type: String,
        },
        drugName: {
            type: String,
        },
        genericName: {
            type: String,
        },
        drugclass: {
            type: String,
        },
        prescribed: {
            type: String,
            required: true,
        },
        lastPrescribed: {
            type: Date,
        },
        status: {
            type: String,
            default: 'inactive',
        },
        refillRequest: [
            {
                refillId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'refillRequests',
                },
            },
        ],
        createdMonth: {
            type: String,
        },
        createdYear: String,
    },
    { timestamps: true }
)

module.exports = mongoose.model('prescriptions', prescriptionSchema)
