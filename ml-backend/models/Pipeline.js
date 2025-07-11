const mongoose = require('mongoose')

const pipelineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  nodes: {
    type: Array,
    required: true,
  },
  edges: {
    type: Array,
    required: true,
  },
})

const Pipeline = mongoose.model('Pipeline', pipelineSchema)
module.exports = Pipeline
