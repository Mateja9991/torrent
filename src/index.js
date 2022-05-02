const http = require('http')
const express = require('express')

const { initializeEnvironment } = require('./utils')
initializeEnvironment()

const app = express();
const server = http.createServer()

app.use(express.json())

server.listen(process.env.PORT, () => {
  console.log(`Server is up on port: ${process.env.PORT}`)
})
