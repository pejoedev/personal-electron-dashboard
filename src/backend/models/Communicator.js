/**
 * Manages communication between main and renderer processes
 * Handles message sending and event subscriptions
 */
class Communicator {
    /**
     * Create a new Communicator instance
     * @param {BrowserWindow} mainWindow - Reference to the main Electron window
     */
    constructor(mainWindow = null) {
        this.mainWindow = mainWindow;
        this.subscribers = new Map(); // Map of event type -> Set of callbacks
        this.subscriberIds = new Map(); // Map of subscriber id -> {eventType, callback}
        this.nextSubscriberId = 0;
    }

    /**
     * Set the main window reference
     * @param {BrowserWindow} mainWindow - Reference to the main Electron window
     */
    setMainWindow(mainWindow) {
        this.mainWindow = mainWindow;
    }

    /**
     * Send a message to the renderer process
     * @param {string} eventType - The type of event/message to send
     * @param {any} data - The data to send
     * @returns {boolean} Whether the message was sent successfully
     */
    send(eventType, data = null) {
        if (!this.mainWindow || !this.mainWindow.webContents) {
            console.warn(`[Communicator] Cannot send "${eventType}" - no window reference`);
            return false;
        }

        try {
            // Send through unified 'message-from-main' channel with eventType in payload
            this.mainWindow.webContents.send('message-from-main', {
                eventType,
                data,
                timestamp: new Date(),
            });
            console.log(`[Communicator] Sent "${eventType}" to renderer`);
            return true;
        } catch (error) {
            console.error(`[Communicator] Failed to send "${eventType}":`, error);
            return false;
        }
    }

    /**
     * Subscribe to incoming messages from the renderer
     * @param {string} eventType - The event type to listen for
     * @param {Function} callback - Callback function to execute when message is received
     * @param {any} owner - Optional owner object for grouping subscriptions (for cleanup)
     * @returns {number} Subscriber ID (needed to unsubscribe)
     */
    subscribe(eventType, callback, owner = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const subscriberId = this.nextSubscriberId++;

        // Initialize set for this event type if it doesn't exist
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }

        // Add callback to subscribers
        this.subscribers.get(eventType).add(callback);
        this.subscriberIds.set(subscriberId, { eventType, callback, owner });

        console.log(`[Communicator] Subscribed to "${eventType}" (ID: ${subscriberId}${owner ? `, owner: ${owner.constructor.name}` : ''})`);
        return subscriberId;
    }

    /**
     * Unsubscribe from messages by subscriber ID
     * @param {number} subscriberId - The subscriber ID returned from subscribe()
     * @returns {boolean} Whether unsubscription was successful
     */
    unsubscribe(subscriberId) {
        const subscriber = this.subscriberIds.get(subscriberId);

        if (!subscriber) {
            console.warn(`[Communicator] Subscriber ID ${subscriberId} not found`);
            return false;
        }

        const { eventType, callback } = subscriber;
        const callbacks = this.subscribers.get(eventType);

        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.subscribers.delete(eventType);
            }
        }

        this.subscriberIds.delete(subscriberId);
        console.log(`[Communicator] Unsubscribed from "${eventType}" (ID: ${subscriberId})`);
        return true;
    }

    /**
     * Unsubscribe all listeners for a specific event type
     * @param {string} eventType - The event type to clear
     */
    unsubscribeAll(eventType) {
        if (!this.subscribers.has(eventType)) {
            return;
        }

        const callbacks = this.subscribers.get(eventType);

        // Find and remove all subscriber IDs associated with this event type
        for (const [subId, sub] of this.subscriberIds.entries()) {
            if (sub.eventType === eventType) {
                this.subscriberIds.delete(subId);
            }
        }

        this.subscribers.delete(eventType);
        console.log(`[Communicator] Cleared all subscriptions for "${eventType}"`);
    }

    /**
     * Emit a message to all subscribers of a specific event type
     * @param {string} eventType - The event type to emit
     * @param {any} data - The data to pass to subscribers
     */
    emit(eventType, data = null) {
        if (!this.subscribers.has(eventType)) {
            console.log(`[Communicator] No subscribers for event "${eventType}"`);
            return;
        }

        const callbacks = this.subscribers.get(eventType);
        callbacks.forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[Communicator] Error in subscriber callback for "${eventType}":`, error);
            }
        });
    }

    /**
     * Unsubscribe all subscriptions owned by a specific owner
     * @param {any} owner - The owner object to match
     */
    unsubscribeByOwner(owner) {
        const subIdsToDelete = [];

        // Find all subscriber IDs owned by this owner
        for (const [subId, sub] of this.subscriberIds.entries()) {
            if (sub.owner === owner) {
                subIdsToDelete.push(subId);
            }
        }

        // Remove each subscription
        subIdsToDelete.forEach((subId) => {
            this.unsubscribe(subId);
        });

        console.log(`[Communicator] Unsubscribed all subscriptions for owner (${subIdsToDelete.length} removed)`);
    }

    /**
     * Get all subscription info (for debugging)
     * @returns {Object} Status information
     */
    getStatus() {
        const eventTypes = Array.from(this.subscribers.keys());
        const subscriptionCounts = {};
        const subscriberDetails = [];

        eventTypes.forEach((eventType) => {
            subscriptionCounts[eventType] = this.subscribers.get(eventType).size;
        });

        // Collect subscriber details with owner info
        for (const [subId, sub] of this.subscriberIds.entries()) {
            subscriberDetails.push({
                id: subId,
                eventType: sub.eventType,
                hasOwner: !!sub.owner,
                ownerName: sub.owner ? sub.owner.constructor.name : 'none',
            });
        }

        return {
            hasWindow: !!this.mainWindow,
            eventTypes,
            subscriptionCounts,
            totalSubscribers: this.subscriberIds.size,
            subscribers: subscriberDetails,
        };
    }
}

module.exports = Communicator;
