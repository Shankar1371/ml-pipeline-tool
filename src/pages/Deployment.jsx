import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import api from '../api/api'

const Deployment = () => {
  const [pipelineData, setPipelineData] = useState(null)
  const [imageURLs, setImageURLs] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [predictedClass, setPredictedClass] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)

  useEffect(() => {
    try {
      const data = localStorage.getItem('pipelineOutput')
      if (data) {
        const parsed = JSON.parse(data)
        setPipelineData(parsed)
        setImageURLs(parsed.imageURLs || [])
      }
    } catch (error) {
      console.error('Error loading pipelineOutput from localStorage:', error)
    }
  }, [])

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewImage(URL.createObjectURL(file))
      setPredictedClass('')
    }
  }

  const handlePredict = async () => {
    if (!selectedFile) {
      alert('Please select an image to predict.')
      return
    }

    const formData = new FormData()
    formData.append('image', selectedFile)
    setIsPredicting(true)

    try {
      const response = await api.post('/pipelines/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      console.log('Prediction response:', response.data)
      setPredictedClass(response.data.prediction)
    } catch (err) {
      console.error('Prediction error:', err)
      alert(' Failed to get prediction.')
      setPredictedClass('')
    } finally {
      setIsPredicting(false)
    }
  }

  return (
    <Container>
      <h1> Pipeline Execution Results</h1>

      {pipelineData ? (
        <OutputCard>
          <p>
            <strong>Status:</strong> {pipelineData.message || 'No message'}
          </p>
          {pipelineData.executedAt && (
            <p>
              <strong>Executed At:</strong>{' '}
              {new Date(pipelineData.executedAt).toLocaleString()}
            </p>
          )}
          {pipelineData.model && (
            <p>
              <strong>Model:</strong> {pipelineData.model}
            </p>
          )}
          {pipelineData.accuracy && (
            <p>
              <strong>Accuracy:</strong>{' '}
              {(pipelineData.accuracy * 100).toFixed(2)}%
            </p>
          )}
          {pipelineData.downloadLink && (
            <p>
              <strong>Download Model:</strong>{' '}
              <a
                href={`http://localhost:5000${pipelineData.downloadLink}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                Download .pkl
              </a>
            </p>
          )}
          <p>
            <strong>Pipeline Stages:</strong>
          </p>
          <ul>
            {pipelineData.stagesExecuted?.map((stage, idx) => (
              <li key={idx}>{stage}</li>
            ))}
          </ul>

          {imageURLs.length > 0 && (
            <>
              <h3>Processed Images</h3>
              <ImageGrid>
                {imageURLs.map((url, idx) => (
                  <img
                    key={idx}
                    src={`http://localhost:5000${url}`}
                    alt={`Processed ${idx}`}
                  />
                ))}
              </ImageGrid>
            </>
          )}

          <h3>Predict Using Trained Model</h3>
          <input type='file' accept='image/*' onChange={handleFileChange} />

          {previewImage && (
            <>
              <PreviewContainer>
                <h4>Preview:</h4>
                <img src={previewImage} alt='Uploaded Preview' />
              </PreviewContainer>
              <SidebarButton onClick={handlePredict} disabled={isPredicting}>
                {isPredicting ? '🔄 Predicting...' : '🔍 Predict'}
              </SidebarButton>
            </>
          )}

          {predictedClass && (
            <PredictionResult>
              <strong>Prediction:</strong> {predictedClass}
            </PredictionResult>
          )}
        </OutputCard>
      ) : (
        <Placeholder>No recent pipeline executions found.</Placeholder>
      )}
    </Container>
  )
}

export default Deployment

const Container = styled.div`
  padding: 20px;
`

const OutputCard = styled.div`
  background: #f7f7f7;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`

const Placeholder = styled.p`
  color: #777;
  font-style: italic;
`

const ImageGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;

  img {
    width: 150px;
    height: 150px;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
`

const PredictionResult = styled.p`
  margin-top: 10px;
  padding: 10px;
  background-color: #e3f7e8;
  border-left: 5px solid #28a745;
  font-weight: bold;
  color: #2f6627;
`

const PreviewContainer = styled.div`
  margin-top: 15px;

  img {
    max-width: 200px;
    border-radius: 6px;
    border: 1px solid #ccc;
    margin-top: 5px;
  }
`

const SidebarButton = styled.button`
  margin-top: 12px;
  padding: 10px 20px;
  font-weight: bold;
  background-color: #007bff;
  color: white;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`
