const mlTasks = {
  'Processing Node': (inputData) => {
    console.log('Processing data:', inputData)
    return inputData.map((x) => x * 2) // Example transformation
  },
  'Training Node': (dataset) => {
    console.log('Training model on:', dataset)
    return { model: 'Trained Model', accuracy: 0.95 } // Dummy output
  },
  'Evaluation Node': (model) => {
    console.log('Evaluating model:', model)
    return { performance: 'Good', score: 0.89 } // Dummy output
  },
}

export default mlTasks
