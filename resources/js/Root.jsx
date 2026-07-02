import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from '@/App';  // Import the main App component
// import Login from '@/components/Login';  // Import Login component
import Dashboard from '@/components/Dashboard';  // Import Dashboard component

function Root() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        {/* <Route path="/login" element={<Login onLogin={handleLogin} />} /> */}
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Add other routes for inventory, billing, etc. */}
      </Routes>
    </Router>
  );
}

export default Root;
