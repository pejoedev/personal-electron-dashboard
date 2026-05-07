import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import RSSFeeds from './pages/RSSFeeds';
import './styles/default.css';
import './styles/pageElements.css';
import './styles/dashboard.css';
import './styles/messages.css';
import './styles/rss-feeds.css';
import './styles/settings.css';

console.log('[App] Initializing App component');

function App() {
  console.log('[App] Rendering App');
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="rss-feeds" element={<RSSFeeds />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
