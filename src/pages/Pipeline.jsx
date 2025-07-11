// Visual editor page where users build and execute their ML pipeline. Nodes
// are dragged onto a canvas and the resulting graph is sent to the backend for
// training.
import React, { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import styled from 'styled-components'
import api from '../api/api'

// Available pipeline steps users can drag into the canvas. Each entry defines
// a label and a background color for the node.
const nodeTypes = {
  dataIngestion: {
    label: 'Data Ingestion',
    style: { backgroundColor: '#FF5733' },
  },
  dataValidation: {
    label: 'Data Validation',
    style: { backgroundColor: '#33FF57' },
  },
  duplicateRemoval: {
    label: 'Duplicate Removal',
    style: { backgroundColor: '#3357FF' },
  },
  filteringForRelevance: {
    label: 'Filtering for Relevance',
    style: { backgroundColor: '#FF33A1' },
  },
  outlierRemoval: {
    label: 'Outlier Removal',
    style: { backgroundColor: '#FF8C33' },
  },
  classBalancing: {
    label: 'Class Balancing',
    style: { backgroundColor: '#8C33FF' },
  },
  noiseReduction: {
    label: 'Noise Reduction',
    style: { backgroundColor: '#33FFF5' },
  },
  scalingAndCropping: {
    label: 'Scaling and Cropping',
    style: { backgroundColor: '#FF3333' },
  },
  colorspaceConversion: {
    label: 'Colorspace Conversion',
    style: { backgroundColor: '#33FF8C' },
  },
  augmentationAndValidation: {
    label: 'Augmentation and Validation',
    style: { backgroundColor: '#FF33FF' },
  },
  modelTraining: {
    label: 'Model Training',
    style: { backgroundColor: '#1E90FF' },
  },
  modelEvaluation: {
    label: 'Model Evaluation',
    style: { backgroundColor: '#20B2AA' },
  },
  exportTrainedModel: {
    label: 'Export Trained Model',
    style: { backgroundColor: '#FFD700' },
  },
}

const Pipeline = () => {
  const reactFlowWrapper = useRef(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [logs, setLogs] = useState([])

  // Connect to the backend WebSocket to receive real-time logs during
  // training.
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000')
    ws.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data])
    }
    ws.onerror = (err) => console.error('WebSocket error:', err)
    ws.onopen = () => console.log('📡 WebSocket connected')
    ws.onclose = () => console.warn('🔌 WebSocket disconnected')
    return () => ws.close()
  }, [])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })
      const newNode = {
        id: `${type}_${Date.now()}`,
        type: 'default',
        position,
        data: { label: nodeTypes[type].label },
        style: nodeTypes[type].style,
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const handleFileUpload = async (e) => {
    // Users upload a ZIP containing labeled image folders. The backend
    // extracts it to prepare training data.
    const file = e.target.files[0]
    if (!file || !file.name.endsWith('.zip')) {
      alert('Please upload a .zip file with labeled image folders.')
      return
    }
    const formData = new FormData()
    formData.append('images', file)
    try {
      await api.post('/pipelines/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percent)
        },
      })
      alert('Dataset ZIP uploaded and extracted successfully!')
    } catch (err) {
      alert(' Failed to upload ZIP dataset.')
      console.error(err)
    } finally {
      setUploadProgress(0)
    }
  }

  const executePipeline = async () => {
    // Sends the current graph to the backend which runs ml_engine.py
    // and streams logs back via WebSocket.
    if (nodes.length === 0) {
      alert('Please add nodes to execute the pipeline.')
      return
    }
    try {
      const response = await api.post('/pipelines/execute', { nodes, edges })
      localStorage.setItem('pipelineOutput', JSON.stringify(response.data))
      alert('Pipeline executed successfully! Check the Deployment page.')
    } catch (err) {
      alert(` Pipeline execution failed: ${err.message}`)
      console.error(err)
    } finally {
      setTrainingProgress(0)
    }
  }

  const savePipeline = async () => {
    // Store the current pipeline graph in MongoDB so it can be reused later.
    if (nodes.length === 0) {
      alert('Cannot save an empty pipeline!')
      return
    }
    const pipelineName = prompt('Enter a pipeline name:')
    if (!pipelineName) {
      alert('Pipeline name is required.')
      return
    }
    try {
      await api.post('/pipelines/save', { name: pipelineName, nodes, edges })
      alert('Pipeline saved to backend successfully!')
    } catch (error) {
      alert('Error saving pipeline: ' + error.message)
      console.error(error)
    }
  }

  const loadPipeline = async () => {
    // Fetch previously saved pipelines from the backend and let the user
    // choose one to load into the editor.
    try {
      const response = await api.get('/pipelines/all')
      const pipelines = response.data
      if (pipelines.length === 0) {
        alert('No pipelines available to load.')
        return
      }
      const pipelineNames = pipelines
        .map((p, idx) => `${idx + 1}. ${p.name}`)
        .join('\n')
      const choice = prompt(`Choose a pipeline to load:\n${pipelineNames}`)
      const index = parseInt(choice) - 1
      if (index >= 0 && index < pipelines.length) {
        setNodes(pipelines[index].nodes)
        setEdges(pipelines[index].edges)
        alert(`Pipeline '${pipelines[index].name}' loaded successfully!`)
      } else {
        alert('Invalid selection.')
      }
    } catch (error) {
      alert('Error loading pipelines: ' + error.message)
      console.error(error)
    }
  }

  return (
    <ReactFlowProvider>
      <Container>
        <SidebarContainer>
          <h3>Nodes</h3>
          {Object.entries(nodeTypes).map(([type, { label, style }]) => (
            <DraggableNode
              key={type}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/reactflow', type)
                event.dataTransfer.effectAllowed = 'move'
              }}
              style={style}
            >
              {label}
            </DraggableNode>
          ))}

          {uploadProgress > 0 && (
            <ProgressBar>
              <div style={{ width: `${uploadProgress}%` }}>
                {uploadProgress}%
              </div>
            </ProgressBar>
          )}

          {trainingProgress > 0 && (
            <ProgressBar>
              <div style={{ width: `${trainingProgress}%` }}>
                {trainingProgress}% Training
              </div>
            </ProgressBar>
          )}

          <SidebarButton onClick={executePipeline}>
            Execute Pipeline
          </SidebarButton>
          <SidebarButton onClick={savePipeline}>Save Pipeline</SidebarButton>
          <SidebarButton onClick={loadPipeline}>Load Pipeline</SidebarButton>

          <input
            type='file'
            accept='.zip'
            onChange={handleFileUpload}
            style={{ marginTop: '10px', width: '100%' }}
          />
        </SidebarContainer>

        <MainArea ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>

          <LogViewer>
            <h4> Real-Time Logs</h4>
            <pre>{logs.join('\n')}</pre>
          </LogViewer>
        </MainArea>
      </Container>
    </ReactFlowProvider>
  )
}

export default Pipeline

const Container = styled.div`
  display: flex;
  height: 100vh;
`
const SidebarContainer = styled.div`
  width: 20%;
  background: #f4f4f4;
  padding: 20px;
  overflow-y: auto;
  border-right: 2px solid #ddd;
`
const DraggableNode = styled.div`
  padding: 10px;
  margin-bottom: 8px;
  color: white;
  text-align: center;
  border-radius: 4px;
  cursor: grab;
  &:hover {
    opacity: 0.8;
  }
`
const MainArea = styled.div`
  flex-grow: 1;
  position: relative;
`
const SidebarButton = styled.button`
  width: 100%;
  padding: 10px 15px;
  margin-top: 10px;
  font-weight: bold;
  background-color: #007bff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  &:hover {
    background-color: #0069d9;
  }
`
const ProgressBar = styled.div`
  width: 100%;
  background-color: #eee;
  margin-top: 10px;
  border-radius: 6px;
  overflow: hidden;
  div {
    height: 20px;
    background-color: #007bff;
    color: white;
    text-align: center;
    line-height: 20px;
    font-weight: bold;
    transition: width 0.3s;
  }
`
const LogViewer = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 150px;
  background: #1e1e1e;
  color: #0f0;
  padding: 10px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.85rem;
`
