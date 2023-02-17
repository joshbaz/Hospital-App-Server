const mongoose = require('mongoose')

const prescriptionidTrackSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        prescriptionIdentity: {
            type: String,
            required: true,
            default: 'PCB',
        },
        currentNumber: {
            type: Number,
            default: 0,
            required: true,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model(
    'prescriptionIdTrackings',
    prescriptionidTrackSchema
)
