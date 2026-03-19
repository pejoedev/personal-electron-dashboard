# Personal Electron Dashboard

A modern, responsive Electron dashboard application with a clean architecture and professional UI.

## 📁 Project Structure

```
personal-electron-dashboard/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure IPC communication bridge
│   ├── index.html       # Dashboard HTML template
│   ├── styles.css       # Dashboard styling
│   └── app.js           # Renderer process logic
├── assets/              # Static assets (images, icons, etc.)
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
```

### Development

Start the app in development mode:

```bash
npm start
# or
npm run dev
```

## 📋 Features

- **Header Navigation**: Sticky header with easy navigation between sections
- **Dashboard Cards**: Display key metrics and statistics
- **Responsive Design**: Works on desktop and scales to mobile viewports
- **Footer**: Professional footer with links and information
- **Modular Structure**: Easy to extend and customize
- **Secure IPC**: Electron preload script for safe main/renderer communication

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