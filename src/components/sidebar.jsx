import React from 'react'
import styled from 'styled-components'

const SidebarContainer = styled.div`
  width: 200px;
  height: 100vh;
  background: #333;
  color: white;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const DraggableNode = styled.div`
  padding: 10px;
  background: #555;
  border-radius: 5px;
  cursor: grab;
  text-align: center;

  &:hover {
    background: #777;
  }
`

const Sidebar = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <SidebarContainer>
      <p>Drag Nodes</p>
      <DraggableNode
        onDragStart={(event) => onDragStart(event, 'default')}
        draggable
      >
        Default Node
      </DraggableNode>
      <DraggableNode
        onDragStart={(event) => onDragStart(event, 'custom')}
        draggable
      >
        Custom Node
      </DraggableNode>
    </SidebarContainer>
  )
}

export default Sidebar
