# Development Guide

This guide explains how to set up and run the Personal Electron Dashboard in development mode.

## Prerequisites

- **Node.js**: v14 or higher
- **npm**: comes with Node.js
- **Electron Rebuild**: needed for native modules like better-sqlite3

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd personal-electron-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Rebuild native modules (important for better-sqlite3):
```bash
npx electron-rebuild
```

## Development Setup

The application consists of two parts:
- **Frontend**: React app built with Vite (runs on port 5173)
- **Backend**: Electron app (loads the frontend)

### Option 1: Running Both Together (Recommended for Development)

In one terminal, start the Vite dev server:
```bash
npm run dev:vite
```

In another terminal, start Electron with dev server enabled:
```bash
npm run dev:electron
```

Electron will load from http://localhost:5173 and you'll see the React app with hot module replacement (HMR).

### Option 2: Running Frontend Only

If you only want to work on the frontend:
```bash
npm run dev:vite
```

Then open http://localhost:5173 in your browser.

### Option 3: Running Built App

Build the production bundle and run it:
```bash
npm run build:frontend
npm start
```

## Project Structure

```
src/
├── backend/              # Electron main process
│   ├── main.js          # App entry point, window management
│   ├── preload.js       # IPC bridge to renderer
│   ├── models/          # Data models and handlers
│   │   ├── Communicator.js
│   │   ├── RSSFeedsHandler.js
│   │   ├── MessagesHandler.js
│   │   └── ...
│   └── rss/             # RSS feed logic
│
└── frontend/            # React frontend
    ├── main.jsx         # React entry point
    ├── App.jsx          # Main app component with routing
    ├── index.html       # HTML template
    ├── hooks/           # Custom React hooks
    │   └── useIPC.js    # IPC communication hook
    ├── components/      # Reusable components
    │   ├── Layout.jsx
    │   ├── Header.jsx
    │   └── Footer.jsx
    ├── pages/           # Page components
    │   ├── Dashboard.jsx
    │   ├── Messages.jsx
    │   └── Settings.jsx
    └── styles/          # CSS files
        ├── default.css
        ├── dashboard.css
        └── ...
```

## Key Files to Know

### Frontend Entry Points
- `src/frontend/main.jsx` - React entry point, renders App component
- `src/frontend/App.jsx` - Main component with React Router setup
- `src/frontend/hooks/useIPC.js` - Custom hook for IPC communication

### Communication
- `src/frontend/hooks/useIPC.js` - React hook for sending/receiving IPC messages
- `src/backend/preload.js` - Exposes IPC API to renderer
- `src/backend/main.js` - Handles IPC messages from renderer

### Styling
All CSS files are automatically imported in `App.jsx` and work with Vite's CSS handling.

## Common Tasks

### Adding a New Page

1. Create a new component in `src/frontend/pages/NewPage.jsx`:
```jsx
import React from 'react';
import { useIPC } from '../hooks/useIPC';

function NewPage() {
  const { send, subscribe } = useIPC();
  
  // Your page logic here
  return <div>New Page</div>;
}

export default NewPage;
```

2. Add route to `src/frontend/App.jsx`:
```jsx
<Route path="newpage" element={<NewPage />} />
```

3. Add nav link to `src/frontend/components/Header.jsx`:
```jsx
{ path: '/newpage', label: 'New Page' }
```

### Communicating with Backend

Use the `useIPC` hook:
```jsx
const { send, subscribe } = useIPC();

// Send a message
send('request-some-data', { param: 'value' });

// Subscribe to responses
const unsubscribe = subscribe('some-data-response', (data) => {
  console.log('Received:', data);
});

// Clean up subscription
return unsubscribe;
```

### Hot Module Replacement (HMR)

When running with `npm run dev:vite` and `npm run dev:electron`, changes to React components will hot-reload automatically. Changes to backend code require an Electron restart.

## Debugging

### Frontend
1. Open DevTools in Electron: The dev script automatically opens DevTools
2. React Developer Tools: Install React DevTools extension for better debugging
3. Console messages: Check the DevTools console for any errors

### Backend
1. Add console.log statements in `src/backend/main.js` and other backend files
2. The backend logs will appear in the terminal where Electron is running

## Building for Production

1. Build the frontend:
```bash
npm run build:frontend
```

2. Build the Electron app:
```bash
npm run build
```

For Linux specifically:
```bash
npm run build:linux
```

This creates an AppImage and .deb file in the `dist` directory.

## Troubleshooting

### Port 5173 Already in Use
If Vite can't start on port 5173, either:
- Kill the process using that port: `lsof -i :5173` then `kill -9 <PID>`
- Or change the port in `vite.config.js`

### Electron Can't Connect to Dev Server
Make sure Vite is running first before starting Electron. Electron looks for the dev server on http://localhost:5173.

### Build Errors
1. Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
2. Rebuild native modules: `npx electron-rebuild`
3. Clear Vite cache: `rm -rf dist && npm run build:frontend`

### IPC Communication Not Working
1. Check that messages are being sent: Look for `[useIPC] Sent` messages in console
2. Verify backend is listening: Check for subscribe calls in backend handlers
3. Check preload.js is properly exposing the API: Look at DevTools console for errors

## Next Steps

- Read the [README.md](./README.md) for project overview
- Check [src/backend/models/](./src/backend/models/) for understanding data flow
- Review [src/frontend/pages/](./src/frontend/pages/) to see example page implementations
