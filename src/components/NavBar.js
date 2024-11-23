import React, { useState, useEffect } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import logo from '../assets/logo.svg';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import FormHelperText from '@mui/material/FormHelperText';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import { TransitionProps } from '@mui/material/transitions';
import Slide from '@mui/material/Slide';

import {
  Container,
  Navbar,
  Nav,
  NavItem,
  NavLink,
  Button,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

import { useAuth0 } from "@auth0/auth0-react";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const NavBar = () => {
  const {
    user,
    isAuthenticated,
    loginWithRedirect,
    logout,
  } = useAuth0();

  const [search, setSearch] = useState('');

  const [open, setOpen] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const openSearch = () => {
    setOpen(true)
  }
  
  const closeSearch = () => {
    setOpen(false)
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  }

  useEffect(() => {
    console.log(search)
  }, [search])

  const logoutWithRedirect = () =>
    logout({
        logoutParams: {
          returnTo: window.location.origin,
        }
    });

  return (
    <div className="nav-container">
      <Navbar color="light" light expand="md" container={false}>
        <Container>
          <img id="faithForgeLogo" src={logo} alt="Faith Forge Academy logo"/>
            <Nav className="d-none d-md-block" navbar>
              {!isAuthenticated && (
                <NavItem>
                  <Button
                    id="qsLoginBtn"
                    color="primary"
                    className="btn-margin"
                    onClick={() => loginWithRedirect()}
                  >
                    Log in
                  </Button>
                </NavItem>
              )}
              {isAuthenticated && (
                <>
                  <NavItem>
                  <Button
                    id="qsSearchBtn"
                    color="primary"
                    className="btn-margin"
                    onClick={() => openSearch()}
                  >
                    Search
                  </Button>
                </NavItem>
                <UncontrolledDropdown nav inNavbar>
                  <DropdownToggle nav caret id="profileDropDown">
                    <img
                      src={user.picture}
                      alt="Profile"
                      className="nav-user-profile rounded-circle"
                      width="50"
                    />
                  </DropdownToggle>
                  <DropdownMenu>
                    <DropdownItem header>{user.name}</DropdownItem>
                    <DropdownItem
                      tag={RouterNavLink}
                      to="/profile"
                      className="dropdown-profile"
                      activeClassName="router-link-exact-active"
                    >
                      <FontAwesomeIcon icon="user" className="mr-3" /> Profile
                    </DropdownItem>
                    <DropdownItem
                      id="qsLogoutBtn"
                      onClick={() => logoutWithRedirect()}
                    >
                      <FontAwesomeIcon icon="power-off" className="mr-3" /> Log
                      out
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </>
              )}
            </Nav>
        </Container>
        <Container>
        <Nav className="mr-auto" navbar>
              <NavItem>
                <NavLink
                  tag={RouterNavLink}
                  to="/"
                  exact
                  activeClassName="router-link-exact-active"
                >
                  Home
                </NavLink>
              </NavItem>
              {isAuthenticated && (
                <NavItem>
                  <NavLink
                    tag={RouterNavLink}
                    to="/study"
                    exact
                    activeClassName="router-link-exact-active"
                  >
                    Study
                  </NavLink>
                </NavItem>
              )}
            </Nav>
        </Container>
      </Navbar>
      <Dialog fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}>
      <>
        <Button
          id="qsSearchBtn"
          color="primary"
          className="btn-margin"
          onClick={() => closeSearch()}
        >
          X
        </Button>
        <FormControl>    
            <InputLabel htmlFor="search-field">Search</InputLabel>
            <Input id="search-field" aria-describedby="search-help" value={search} onChange={handleSearchChange}/>
            <FormHelperText id="search-help">Search for a scripture</FormHelperText>
        </FormControl>
      </>
      </Dialog>
    </div>
  );
};

export default NavBar;
