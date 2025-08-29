// src/App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from 'react-router-dom';

import MatchingPage from './pages/MatcherPage.jsx';
import FamePage     from './pages/FamePage.jsx';
import AdminLogin   from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/match" element={<MatchingPage />} />
        <Route path="/fame" element={<FamePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        {/* you can add a 404 route here */}
      </Routes>
    </Router>
  );
}