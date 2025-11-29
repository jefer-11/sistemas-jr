// sistemas-jr/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Importa el componente App
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App /> // Renderiza App.jsx
  </React.StrictMode>,
);