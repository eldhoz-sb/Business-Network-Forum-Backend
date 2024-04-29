const config = require('./utils/config')
const express = require('express')
require('express-async-errors')
const app = express()
const cors = require('cors')
const membersRouter = require('./controllers/members')
const loginRouter = require('./controllers/login')
const connectionRouter = require('./controllers/connectionRouter')
const postRouter = require('./controllers/postRouter')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const path = require('path')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Member = require('./models/member')

logger.info('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('connected to MongoDB')
  })
  .catch((error) => {
    logger.error('error connecting to MongoDB:', error.message)
  })


app.use(cors())
app.use(express.json())
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)
app.use(middleware.userExtractor)


app.use('/api/members', membersRouter)
app.use('/api/login', loginRouter)
app.use('/api/members/connections', connectionRouter)
app.use('/api/posts', postRouter)
app.use('/images', express.static(path.join(__dirname, 'uploads'))); // Adjust path as needed



app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app