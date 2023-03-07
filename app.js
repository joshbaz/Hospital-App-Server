const express = require('express')
const cors = require('cors')

const mongoose = require('mongoose')
const bodyparser = require('body-parser')
require('dotenv').config()
const app = express()

//import routes
const adminRoutes = require('./api/routes/adminRoutes')
const patientRoutes = require('./api/routes/patientRoutes')
const appPatientRoutes = require('./api/routes/appPatientRoutes')
const appVitalRoutes = require('./api/routes/appVitalsRoutes')
//apply middleware
app.use(cors())
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))

//set headers
app.use((req, res, next) => {
    res.setHeader('Access-control-Allow-Origin', '*')
    res.setHeader(
        'Access-Cpntrol-Allow-Headers',
        'Origin, A-Requested-Width, Content-Type, Accept, Authorization'
    )

    if (req.method === 'OPTIONS') {
        res.setHeader(
            'Access-Control-Allow-Methods',
            'PUT',
            'PATCH',
            'POST',
            'DELETE',
            'GET'
        )
        return res.status(200).json({})
    }
    next()
})

app.get('/', (req, res, next) => {
    res.send('Running server')
})

//routes attached to express app
app.use('/admin', adminRoutes)
app.use('/patient', patientRoutes)
app.use('/appPatient', appPatientRoutes)
app.use('/appVital', appVitalRoutes)

/** global error handling */
app.use((error, req, res, next) => {
    const status = error.statusCode || 500
    const message = error.message
    const data = error.data

    res.status(status).json(message)
})

//apply database
mongoose.Promise = require('bluebird')
mongoose.set('strictQuery', false)
mongoose
    .connect(process.env.MONGO_R_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then((result) => {
        const port = process.env.PORT || 8000

        const server = app.listen(port)

        if (server) {
            console.log('successfully running on port:', port)
            console.log('connected to database:', result.connections[0].name)
            const io = require('./socket').init(server, {
                origins: ['*'],
            })

            io.on('connection', (socket) => {
                //console.log('client connected')
                socket.on('disconnect', () => {
                    console.log('user disconnected')
                })
            })
        } else {
            console.log('failed to run ', port)
        }
    })
    .catch(() => {
        console.log('connection to database failed')
    })
