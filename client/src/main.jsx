import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Mounts the React application into the browser document.
function bootstrapApp() {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrapApp();
/*
File summary:
- Frontend entry point for mounting React.
- Creates the root React tree and renders App into the HTML root element.
- Use for global providers or app-wide bootstrapping.
*/
