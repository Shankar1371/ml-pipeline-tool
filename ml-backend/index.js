// Basic Express setup for the ML backend API. This file boots the
// Node server, connects to MongoDB and wires up the WebSocket used for
// streaming logs to the front end.
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
require('dotenv').config()

const { router: pipelineRoutes, initWebSocket } = require('./routes/pipelines')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use('/pipelines', pipelineRoutes)

// Once the database connection succeeds we start the API server and the
// WebSocket used for streaming training logs.
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(' MongoDB connected.')
    server.listen(PORT, () => {
      console.log(`Server + WebSocket running on port ${PORT}`)
      initWebSocket(server)
    })
  })
  .catch((err) => console.error('MongoDB error:', err))
