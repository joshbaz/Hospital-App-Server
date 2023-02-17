const mongoose = require('mongoose')

const idTrackSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        hospitalIdentity: {
            type: String,
            required: true,
            default: '8HI',
        },
        currentNumber: {
            type: Number,
            default: 0,
            required: true,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('idTrackings', idTrackSchema)
