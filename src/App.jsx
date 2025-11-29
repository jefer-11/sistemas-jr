import React from 'react';
import { AuthProvider } from './AuthContext';
import { Dashboard } from './Dashboard';

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;