import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

function Layout() {
  const location = useLocation();
  const currentPage = location.pathname.split('/')[1] || 'dashboard';
  
  console.log('[Layout] Rendering with currentPage:', currentPage, 'location:', location.pathname);

  return (
    <div className="app-layout">
      <Header currentPage={currentPage} />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
