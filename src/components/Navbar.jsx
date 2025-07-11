import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/Navbar.css'
import styled from 'styled-components'

const NavbarContainer = styled.nav`
  background-color: #333;
  padding: 15px;
  display: flex;
  justify-content: space-around;
  align-items: center;
`
const NavButton = styled(Link)`
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #0056b3;
    box-shadow: 0 0 20px rgba(0, 200, 255, 0.8);
  }

  &.active {
    background: #00ffcc;
    color: black;
    box-shadow: 0 0 15px #00ffcc;
  }
`

const Navbar = () => {
  return (
    <NavbarContainer>
      <NavButton to='/'>Home</NavButton>
      <NavButton to='/Pipeline'>Pipeline</NavButton>
      <NavButton to='/Deployment'>Deployment</NavButton>
    </NavbarContainer>
  )
}

export default Navbar
