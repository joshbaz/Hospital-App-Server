const mongoose = require('mongoose')

const adminSchema = mongoose.Schema(
    {
        _id: mongoose.Schema.Types.ObjectId,
        email: {
            type: String,
            required: true,
        },
        password: { type: String, required: true },
        fullname: {
            type: String,
            required: true,
        },
        mobileNumber: {
            type: String,
            required: true,
        },
        jobPosition: {
            type: String,
            required: true,
        },
        emailEmergency: {
            type: String,
            required: true,
            default: 'false',
        },
        emailNewPatients: {
            type: String,
            required: true,
            default: 'false',
        },

        authType: {
            type: String,
            required: true,
        },
        deactivated: {
            type: String,
            required: true,
            default: false,
        },
        resetToken: String,
        resetTokenExpiration: Date,
    },
    { timestamps: true }
)

module.exports = mongoose.model('administrator', adminSchema)
