import React from "react";
import { NavLink, Link } from "react-router-dom";
import { CATEGORIES } from "../constants";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand"><span className="dot" />Home</Link>
        <div className="nav-links">
          {CATEGORIES.map(c => (
            <NavLink key={c.key} to={`/${c.path}`} className="link">
              {c.label}
            </NavLink>
          ))}
          <NavLink to="/build" className="btn primary">Build</NavLink>
        </div>
      </div>
    </nav>
  );
}
