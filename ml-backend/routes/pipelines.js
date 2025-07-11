// Routes responsible for saving, executing and predicting with ML pipelines.
// Training and prediction are offloaded to Python scripts.
const express = require('express')
const router = express.Router()
const { spawn } = require('child_process')
const Pipeline = require('../models/Pipeline.js')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const unzipper = require('unzipper')
const WebSocket = require('ws')

// Store connected WebSocket clients so we can broadcast training logs.
let wsClients = []

// Create a WebSocket server and keep track of connections. Clients receive
// log lines from the Python processes in real time.
function initWebSocket(server) {
  const wss = new WebSocket.Server({ server })
  wss.on('connection', (socket) => {
    console.log('WebSocket connected')
    wsClients.push(socket)
    socket.on('close', () => {
      wsClients = wsClients.filter((client) => client !== socket)
    })
  })
}

// Helper to send log output to every connected WebSocket client.
function broadcastLog(message) {
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Files uploaded by the user are stored in the uploads/ directory. The ZIP
// dataset is extracted to uploads/dataset for the Python scripts to use.
const uploadDir = path.join(__dirname, '..', 'uploads')
const datasetDir = path.join(uploadDir, 'dataset')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
if (!fs.existsSync(datasetDir)) fs.mkdirSync(datasetDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

// Persist a pipeline's structure to MongoDB so it can be loaded later.
router.post('/save', async (req, res) => {
  const { name, nodes, edges } = req.body
  if (!name || !nodes || !edges) {
    return res.status(400).json({ error: 'Missing pipeline data' })
  }
  const pipeline = new Pipeline({ name, nodes, edges })
  await pipeline.save()
  res.status(201).json({ message: 'Pipeline saved successfully!' })
})

// Upload a dataset ZIP and extract it for training.
router.post('/upload', upload.single('images'), async (req, res) => {
  const zipPath = req.file.path

  try {
    if (fs.existsSync(datasetDir)) fs.rmSync(datasetDir, { recursive: true })

    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: datasetDir }))
      .on('close', () => {
        console.log(' Dataset extracted to:', datasetDir)
        res.status(200).json({ message: 'Dataset uploaded and extracted.' })
      })
      .on('error', (err) => {
        console.error('Extraction error:', err)
        res.status(500).json({ error: 'Failed to extract ZIP file.' })
      })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed.' })
  }
})

// Retrieve all saved pipelines from the database so the user can pick one.
router.get('/all', async (req, res) => {
  try {
    const pipelines = await Pipeline.find()
    res.status(200).json(pipelines)
  } catch (err) {
    console.error('Failed to fetch pipelines:', err)
    res.status(500).json({ error: 'Failed to fetch saved pipelines.' })
  }
})

// Execute the selected pipeline by passing the node/edge data to the
// Python ml_engine script. Logs from the Python process are streamed via
// WebSocket.
router.post('/execute', async (req, res) => {
  const { nodes, edges } = req.body
  if (!nodes || nodes.length === 0) {
    return res.status(400).json({ error: 'Pipeline nodes are required.' })
  }

  const pythonProcess = spawn('python', ['ml_engine.py'], { shell: true })
  let result = ''
  let errorOutput = ''

  pythonProcess.stdout.on('data', (data) => {
    const line = data.toString()
    result += line
    broadcastLog(line)
  })

  pythonProcess.stderr.on('data', (data) => {
    const line = data.toString()
    errorOutput += line
    broadcastLog(`stderr: ${line}`)
  })

  pythonProcess.on('close', () => {
    if (errorOutput) console.error('Python stderr:', errorOutput)

    try {
      const output = JSON.parse(result)
      return res.json(output)
    } catch (err) {
      console.error('Failed to parse Python output:', result)
      return res.status(500).json({
        error: 'Invalid output from Python script.',
        rawOutput: result,
      })
    }
  })

  // Data sent to the Python script via stdin. It includes the React Flow
  // nodes/edges along with the folder containing the extracted images.
  const payload = {
    nodes,
    edges,
    imageFolder: datasetDir,
  }

  pythonProcess.stdin.write(JSON.stringify(payload))
  pythonProcess.stdin.end()
})

// Run a single image through the trained model by invoking predict.py.
router.post('/predict', upload.single('image'), (req, res) => {
  const testImagePath = req.file.path
  console.log(' Launching ML engine for prediction...')

  const py = spawn('python', ['predict.py'], { shell: true })
  let output = ''
  let errorOutput = ''

  py.stdout.on('data', (data) => {
    output += data.toString()
  })

  py.stderr.on('data', (data) => {
    errorOutput += data.toString()
  })

  py.on('close', () => {
    if (errorOutput) {
      console.error('Prediction stderr:', errorOutput)
    }

    const lastJsonLine = output
      .trim()
      .split('\n')
      .filter((line) => {
        return line.startsWith('{') && line.endsWith('}')
      })
      .pop()

    try {
      const json = JSON.parse(lastJsonLine)
      return res.json(json)
    } catch (err) {
      console.error('Failed to parse prediction result:', lastJsonLine)
      return res
        .status(500)
        .json({ error: 'Failed to parse prediction result.' })
    }
  })

  // Send the selected image path to the Python prediction script.
  py.stdin.write(JSON.stringify({ imagePath: testImagePath }))
  py.stdin.end()
})

module.exports = { router, initWebSocket }
