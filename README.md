# Personal Electron Dashboard

A modern, responsive Electron dashboard application built with React and Vite.

## 📁 Project Structure

```
personal-electron-dashboard/
├── src/
│   ├── backend/         # Electron main process & backend logic
│   │   ├── main.js      # Electron main process
│   │   ├── preload.js   # Secure IPC communication bridge
│   │   └── models/      # Data models and handlers
│   ├── frontend/        # React frontend application
│   │   ├── main.jsx     # React entry point
│   │   ├── App.jsx      # Main App component with routing
│   │   ├── index.html   # HTML template
│   │   ├── hooks/       # Custom React hooks
│   │   ├── components/  # Reusable React components
│   │   ├── pages/       # Page components
│   │   └── styles/      # CSS stylesheets
├── dist/                # Built React app (production)
├── assets/              # Static assets (images, icons, etc.)
├── vite.config.js       # Vite configuration
├── package.json         # Project configuration
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Installation

```bash
npm install
npx electron-rebuild
```

### Development

For development, you need to run two processes:

1. **Start the Vite dev server** (in one terminal):
```bash
npm run dev:vite
```

2. **Start Electron** (in another terminal):
```bash
npm run dev:electron
```

The dev server runs on http://localhost:5173 and Electron will load from there.

### Production Build

Build the production bundle:

```bash
npm run build
```

This builds the React app with Vite and packages it with Electron Builder.

### Start Production App

```bash
npm start
```

## 📋 Features

- **React Frontend**: Modern React components with hooks
- **React Router**: Client-side routing between pages
- **Vite Build Tool**: Fast development server and optimized production builds
- **Dashboard**: Display RSS feeds with pagination
- **Messages**: Filter and browse messages with advanced filters
- **Settings**: Customizable user preferences
- **Responsive Design**: Works on desktop and responsive layouts
- **Secure IPC**: Electron preload script for safe main/renderer communication
- **TypeScript Ready**: Can be extended with TypeScript

## 🏗️ Technology Stack

- **Frontend**: React 18, React Router 6, Vite
- **Backend**: Electron, Node.js
- **Database**: better-sqlite3
- **Build Tool**: Vite with React plugin
- **Package Builder**: Electron Builder

## 🎨 Customization

### Modify Colors & Theme
Edit the CSS variables in [src/styles.css](src/styles.css#L1-L18):

```css
:root {
  --primary-color: #2563eb;
  --bg-color: #0f172a;
  /* ... more variables */
}
```

### Add New Sections
1. Add a new `<section>` in [src/index.html](src/index.html)
2. Add a navigation link in the header
3. Add styling in [src/styles.css](src/styles.css) if needed
4. The JavaScript in [src/app.js](src/app.js) handles navigation automatically

### Add IPC Communication
Use the preload script in [src/preload.js](src/preload.js) to expose secure APIs:

```javascript
contextBridge.exposeInMainWorld('electron', {
  myMethod: (arg) => ipcRenderer.invoke('my-channel', arg),
});
```

## 🔧 Build for Production

To package the app for distribution, you'll need to add electron-builder:

```bash
npm install --save-dev electron-builder
```

Then add build scripts to package.json and create a build configuration.

## 📝 License

ISC