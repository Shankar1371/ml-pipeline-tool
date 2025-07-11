const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const uploadDir = path.join(__dirname, '..', 'predict_input')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

router.post('/predict', upload.single('image'), (req, res) => {
  const imagePath = path.join(uploadDir, req.file.filename)

  const pythonProcess = spawn('python', ['predict.py', imagePath], {
    shell: true,
  })

  let result = ''
  let errorOutput = ''

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString()
  })

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString()
  })

  pythonProcess.on('close', () => {
    if (errorOutput) {
      console.error('Python error:', errorOutput)
      return res.status(500).json({ error: 'Prediction failed' })
    }

    try {
      const output = JSON.parse(result)
      res.json(output)
    } catch (e) {
      console.error('Parse error:', e)
      res.status(500).json({ error: 'Invalid output from Python' })
    }
  })
})

module.exports = router
