const mongoose = require('mongoose')
const refillRequestSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        prescriptionUniqueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'prescriptions',
        },
        patientUniqueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'patients',
        },
        prescriptionId: {
            type: String,
        },
        amount: Number,
        createdMonth: String,
        createdDate: String,
        current: String,
    },
    { timestamps: true }
)

module.exports = mongoose.model('refillRequests', refillRequestSchema)
