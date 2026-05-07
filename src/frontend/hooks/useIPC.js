import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for IPC communication with the main process
 * Replaces the old window.communicator pattern
 */
export const useIPC = () => {
  const subscribersRef = useRef(new Map());
  const unsubscribeRef = useRef(null);

  // Initialize the listener on mount
  useEffect(() => {
    if (!window.electronAPI) {
      console.warn('[useIPC] electronAPI not available - running in browser mode');
      return;
    }

    // Set up the main message listener
    unsubscribeRef.current = window.electronAPI.onMessageFromMain?.((data) => {
      if (data && data.eventType && subscribersRef.current.has(data.eventType)) {
        subscribersRef.current.get(data.eventType).forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in IPC listener for ${data.eventType}:`, error);
          }
        });
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const send = useCallback((eventType, data = null) => {
    if (!window.electronAPI) {
      console.warn(`[useIPC] Cannot send "${eventType}" - electronAPI not available (browser mode)`);
      return false;
    }

    try {
      window.electronAPI.sendMessage({
        eventType,
        data,
        timestamp: new Date(),
      });
      console.log(`[useIPC] Sent "${eventType}" to main`);
      return true;
    } catch (error) {
      console.error(`[useIPC] Failed to send "${eventType}":`, error);
      return false;
    }
  }, []);

  const subscribe = useCallback((eventType, callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!window.electronAPI) {
      console.warn(`[useIPC] Cannot subscribe to "${eventType}" - electronAPI not available`);
      // Return a no-op unsubscribe function
      return () => {};
    }

    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }

    subscribersRef.current.get(eventType).add(callback);

    console.log(`[useIPC] Subscribed to "${eventType}"`);

    // Return unsubscribe function
    return () => {
      const callbacks = subscribersRef.current.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscribersRef.current.delete(eventType);
        }
      }
      console.log(`[useIPC] Unsubscribed from "${eventType}"`);
    };
  }, []);

  return { send, subscribe };
};
