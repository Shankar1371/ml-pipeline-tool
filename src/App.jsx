import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar' // Ensure this is the correct path
import { Home, Pipeline, Deployment } from './pages'

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/pipeline' element={<Pipeline />} />
        <Route path='/deployment' element={<Deployment />} />
      </Routes>
    </Router>
  )
}

export default App
