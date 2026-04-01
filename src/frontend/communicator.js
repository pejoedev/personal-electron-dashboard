/**
 * Frontend communication handler
 * Manages message sending to main process and subscribing to messages from main
 */
class FrontendCommunicator {
    /**
     * Create a new FrontendCommunicator instance
     */
    constructor() {
        this.subscribers = new Map(); // Map of event type -> Set of callbacks
        this.subscriberIds = new Map(); // Map of subscriber id -> {eventType, callback}
        this.nextSubscriberId = 0;
        this._listenerSetup = false;

        this.isReady = !!window.electronAPI;
        if (!this.isReady) {
            console.warn('[FrontendCommunicator] electronAPI not available');
        } else {
            // Set up the main message listener immediately
            this._setupMessageListener();
        }
    }

    /**
     * Send a message to the main process
     * @param {string} eventType - The type of event/message to send
     * @param {any} data - The data to send
     * @returns {boolean} Whether the message was sent
     */
    send(eventType, data = null) {
        if (!this.isReady) {
            console.warn(`[FrontendCommunicator] Cannot send "${eventType}" - electronAPI not ready`);
            return false;
        }

        try {
            window.electronAPI.sendMessage({
                eventType,
                data,
                timestamp: new Date(),
            });
            console.log(`[FrontendCommunicator] Sent "${eventType}" to main`);
            return true;
        } catch (error) {
            console.error(`[FrontendCommunicator] Failed to send "${eventType}":`, error);
            return false;
        }
    }

    /**
     * Subscribe to messages from the main process
     * @param {string} eventType - The event type to listen for
     * @param {Function} callback - Callback function to execute when message is received
     * @param {any} owner - Optional owner object for grouping subscriptions (for cleanup)
     * @returns {number} Subscriber ID (needed to unsubscribe)
     */
    subscribe(eventType, callback, owner = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.isReady) {
            console.warn('[FrontendCommunicator] Cannot subscribe - electronAPI not ready');
            return -1;
        }

        const subscriberId = this.nextSubscriberId++;

        // Initialize set for this event type if it doesn't exist
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }

        // Add callback to subscribers
        this.subscribers.get(eventType).add(callback);
        this.subscriberIds.set(subscriberId, { eventType, callback, owner });

        console.log(`[FrontendCommunicator] Subscribed to "${eventType}" (ID: ${subscriberId}${owner ? `, owner: ${owner.constructor.name}` : ''})`);
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
            console.warn(`[FrontendCommunicator] Subscriber ID ${subscriberId} not found`);
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
        console.log(`[FrontendCommunicator] Unsubscribed from "${eventType}" (ID: ${subscriberId})`);
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

        // Find and remove all subscriber IDs associated with this event type
        for (const [subId, sub] of this.subscriberIds.entries()) {
            if (sub.eventType === eventType) {
                this.subscriberIds.delete(subId);
            }
        }

        this.subscribers.delete(eventType);
        console.log(`[FrontendCommunicator] Cleared all subscriptions for "${eventType}"`);
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

        console.log(`[FrontendCommunicator] Unsubscribed all subscriptions for owner (${subIdsToDelete.length} removed)`);
    }

    /**
     * Emit a message to all subscribers of a specific event type
     * @param {string} eventType - The event type to emit
     * @param {any} data - The data to pass to subscribers
     */
    emit(eventType, data = null) {
        if (!this.subscribers.has(eventType)) {
            console.log(`[FrontendCommunicator] No subscribers for event "${eventType}"`);
            return;
        }

        const callbacks = this.subscribers.get(eventType);
        callbacks.forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[FrontendCommunicator] Error in subscriber callback for "${eventType}":`, error);
            }
        });
    }

    /**
     * Internal helper to set up IPC listener for messages from main
     * @private
     */
    _setupMessageListener() {
        if (this._listenerSetup) return;
        this._listenerSetup = true;

        // Set up the main message handler
        window.electronAPI.onMessageFromMain((data) => {
            // data contains: { eventType, data, timestamp }
            if (data && data.eventType) {
                this.emit(data.eventType, data.data);
            }
        });
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
            isReady: this.isReady,
            eventTypes,
            subscriptionCounts,
            totalSubscribers: this.subscriberIds.size,
            subscribers: subscriberDetails,
        };
    }
}

// Create and export global instance
window.communicator = new FrontendCommunicator();
