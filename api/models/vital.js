const mongoose = require('mongoose')
const vitalsSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        patientId: {
            type: String,
            ref: 'patients',
        },
        patientUniqueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'patients',
        },
        vitalTimelineType: {
            type: String,
        },
        dateMeasured: {
            type: String,
            required: true,
        },
        healthType: {
            type: String,
            required: true,
        },
        healthVital: {
            type: String,
            required: true,
        },

        status: {
            type: String,
        },
        creationMonth: String,
        creationYear: String,
        createdDate: String,
    },
    { timestamp: true }
)

module.exports = mongoose.model('vitals', vitalsSchema)
