import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Header({ currentPage }) {
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/messages', label: 'Messages' },
    { path: '/rss-feeds', label: 'RSS Feeds' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-title">
          <h1>Pejoe.dash</h1>
        </div>
        <nav className="header-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${currentPage === item.path.substring(1) ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
