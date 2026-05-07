import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/default.css';

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
    console.error('Root element not found');
    document.body.innerHTML = '<div style="color: red; padding: 2rem;">Error: Root element not found</div>';
} else {
    try {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
        console.log('React app rendered successfully');
    } catch (error) {
        console.error('Error rendering React app:', error);
        rootElement.innerHTML = `<div style="color: red; padding: 2rem;">Error: ${error.message}</div>`;
    }
}
