import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import { faSquareGithub } from '@fortawesome/free-brands-svg-icons'
const Footer = () => (
  <footer className="bg-light p-3 text-center">
    <p>Faith Forge Academy made with <FontAwesomeIcon icon={faHeart} style={{color: "#c01c28",}} /> on <a href="https://github.com/faith-forge-academy">Github <FontAwesomeIcon icon={{faSquareGithub}} /></a></p>
  </footer>
);

export default Footer;
