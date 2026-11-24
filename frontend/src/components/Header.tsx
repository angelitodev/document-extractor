import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="page-header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <i />
          </div>
          <span className="brand-name">File Extractor</span>
        </div>
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/" end>
            Extract
          </NavLink>
          <NavLink to="/templates">Templates</NavLink>
        </nav>
      </div>
    </header>
  );
}
