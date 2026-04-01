# Communication System Guide

This guide explains how to use the new class-based communication system for main-renderer IPC in the Electron app.

## Quick Start

### Backend (Main Process)

```javascript
// The global communicator instance is already created and initialized
// Send a message to the renderer
communicator.send('event-name', { your: 'data' });

// Subscribe to messages from the renderer
const subscriberId = communicator.subscribe('renderer-event', (data) => {
    console.log('Received from renderer:', data);
});

// Unsubscribe when done
communicator.unsubscribe(subscriberId);

// Or unsubscribe all listeners for an event type
communicator.unsubscribeAll('renderer-event');

// Or unsubscribe all subscriptions owned by an object
communicator.unsubscribeByOwner(myObject);
```

### Frontend (Renderer Process)

```javascript
// The global window.communicator instance is automatically created
// Send a message to the main process  
window.communicator.send('event-name', { your: 'data' });

// Subscribe to messages from the main process
const subscriberId = window.communicator.subscribe('main-event', (data) => {
    console.log('Received from main:', data);
});

// Unsubscribe when done
window.communicator.unsubscribe(subscriberId);

// Or unsubscribe all listeners for an event type
window.communicator.unsubscribeAll('main-event');

// Or unsubscribe all subscriptions owned by an object
window.communicator.unsubscribeByOwner(myObject);
```

## Real World Example

### Sending a System Status Request

**Main Process (main.js):**
```javascript
// Subscribe to status requests
communicator.subscribe('request-status', (data) => {
    const status = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
    };
    communicator.send('status-response', status);
});
```

**Renderer Process (app.js):**
```javascript
// Request status from main
window.communicator.send('request-status', {});

// Listen for response
window.communicator.subscribe('status-response', (data) => {
    console.log('System status:', data);
});
```

### Cleanup with Owner Field (Advanced)

When you create an object that owns multiple subscriptions, pass itself as the owner:

**Renderer Process (dashboard-widget.js):**
```javascript
class DashboardWidget {
    constructor() {
        this.statusSub = window.communicator.subscribe('status', (data) => {
            this.onStatus(data);
        }, this);  // Pass 'this' as owner
        
        this.errorSub = window.communicator.subscribe('error', (data) => {
            this.onError(data);
        }, this);  // Pass 'this' as owner
    }
    
    onStatus(data) {
        console.log('Got status:', data);
    }
    
    onError(data) {
        console.error('Got error:', data);
    }
    
    destroy() {
        // Clean up ALL subscriptions owned by this widget at once
        window.communicator.unsubscribeByOwner(this);
        console.log('Widget destroyed, all subscriptions removed');
    }
}

const widget = new DashboardWidget();
// Later...
widget.destroy();  // Removes both 'status' and 'error' subscriptions
```

This pattern mirrors the CronScheduler's owner system for consistent cleanup patterns.

## API Reference

### Backend Communicator

#### `send(eventType, data)`
Send a message to the renderer process.
- **Parameters:**
  - `eventType` (string): Type of event to send
  - `data` (any, optional): Data to include with the message
- **Returns:** boolean (success status)

#### `subscribe(eventType, callback, owner)`
Subscribe to incoming messages from the renderer.
- **Parameters:**
  - `eventType` (string): Type of event to listen for
  - `callback` (function): Function called when message received. Receives data as parameter.
  - `owner` (any, optional): Owner object for grouping subscriptions
- **Returns:** number (subscriber ID for unsubscription)

#### `unsubscribe(subscriberId)`
Unsubscribe a specific listener.
- **Parameters:**
  - `subscriberId` (number): ID returned from subscribe()
- **Returns:** boolean (success status)

#### `unsubscribeAll(eventType)`
Remove all listeners for a specific event type.
- **Parameters:**
  - `eventType` (string): Type of event to clear
  
#### `unsubscribeByOwner(owner)`
Remove all subscriptions owned by a specific owner.
- **Parameters:**
  - `owner` (any): The owner object to match
- **Returns:** void (logs number of removed subscriptions)

#### `emit(eventType, data)`
Manually emit a local event (for internal use mostly).
- **Parameters:**
  - `eventType` (string): Type of event
  - `data` (any, optional): Data to send to subscribers

#### `getStatus()`
Get debugging information about the communicator.
- **Returns:** object with subscription info including owner details

### Frontend Communicator

Has the same API as the backend Communicator.

## Best Practices

1. **Use Owners for Cleanup**: When creating objects that manage multiple subscriptions, always pass `this` as the owner:
   ```javascript
   this.dataSub = window.communicator.subscribe('data', handler, this);
   this.notifSub = window.communicator.subscribe('notification', handler, this);
   ```

2. **Cleanup on Destruction**: Use `unsubscribeByOwner()` in your cleanup method:
   ```javascript
   destroy() {
       window.communicator.unsubscribeByOwner(this);  // Removes all owned subscriptions
   }
   ```

3. **Save Subscriber IDs**: If you need individual control, save the subscriber ID
   ```javascript
   this.statusSubscriber = window.communicator.subscribe('status', handler);
   ```

4. **Use Descriptive Event Names**: Use clear, hierarchical naming
   - ✅ Good: `'user.login'`, `'dashboard.refresh'`, `'settings.updated'`
   - ❌ Bad: `'msg'`, `'update'`, `'data'`

5. **Handle Errors**: Always add error handling in callbacks
   ```javascript
   window.communicator.subscribe('event', (data) => {
       try {
           // Process data
       } catch (error) {
           console.error('Error handling event:', error);
       }
   });
   ```

6. **Logging**: Check the console for [Communicator] log messages during debugging
   ```
   [Communicator] Sent "ping" to renderer
   [Communicator] Subscribed to "pong" (ID: 0, owner: MyClass)
   [Communicator] Unsubscribed all subscriptions for owner (3 removed)
   ```

## Migration from Old API

### Old Way (Still Works)
```javascript
// Main
mainWindow.webContents.send('ping', { data });

// Renderer
window.electronAPI.onPing((data) => { /* ... */ });
```

### New Way
```javascript
// Main
communicator.send('ping', data);

// Renderer with owner
window.communicator.subscribe('ping', (data) => { /* ... */ }, this);
```

The old API is still available for backward compatibility but should not be used in new code.

## Debugging

### Check Communicator Status
```javascript
// In devtools console
communicator.getStatus()
// Returns: {
//   hasWindow: true,
//   eventTypes: ['ping', 'pong', 'status'],
//   subscriptionCounts: { ping: 1, pong: 1, status: 2 },
//   totalSubscribers: 4,
//   subscribers: [
//     { id: 0, eventType: 'ping', hasOwner: false, ownerName: 'none' },
//     { id: 1, eventType: 'pong', hasOwner: true, ownerName: 'DashboardWidget' },
//     { id: 2, eventType: 'status', hasOwner: true, ownerName: 'DashboardWidget' },
//     { id: 3, eventType: 'status', hasOwner: true, ownerName: 'DataManager' }
//   ]
// }
```

### Enable DevTools
Uncomment in `main.js`:
```javascript
mainWindow.webContents.openDevTools();
```
