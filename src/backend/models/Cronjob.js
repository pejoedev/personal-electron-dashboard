const { leftPad } = require("../helpers/leftPad")

/**
 * Represents a scheduled cron job that executes a callback at regular intervals
 */
class Cronjob {
    /**
     * Create a new Cronjob instance
     * @param {string} name - Job name identifier
     * @param {number} intervalMs - Interval between executions in milliseconds (default: 30000ms)
     * @param {Function} callback - Async function to execute
     * @param {number} lastRun - Timestamp of last execution
     * @param {number} nextRun - Timestamp of next scheduled execution
     * @param {boolean} isSceduled - Whether the job is currently scheduled
     * @param {boolean} isRunning - Whether the job is currently running
     * @param {any} owner - Parent object that owns this cron job
     * @param {number} identifier - Unique identifier for this job
     */
    constructor(
        name = null, intervalMs = 30 * 1000,
        callback = null, lastRun = null,
        nextRun = null, isSceduled = false, isRunning = false,
        owner = null, identifier = null
    ) {
        this.name = name;
        this.intervalMs = intervalMs;
        this.callback = callback;
        this.lastRun = lastRun;
        this.nextRun = nextRun;
        this.isSceduled = isSceduled;
        this.isRunning = isRunning;
        this.owner = owner;
        this.identifier = identifier;
        this.timer = null;
        console.log(`[CRON] Created: "${name}" CR${leftPad(this.identifier, 2, "0")} (every ${this.formatInterval(intervalMs)})`);
    }

    /**
     * Format milliseconds into a human-readable interval string
     * @param {number} ms - Milliseconds to format
     * @returns {string} Formatted interval (e.g., "5s", "2m", "1h")
     */
    formatInterval(ms) {
        if (ms == null) return `NULL`
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }

    /**
     * Start the cron job - schedules it to run at regular intervals
     */
    start(immediateExecute = false) {
        if (this.isSceduled) {
            console.warn(
                `[CRON] Job "${this.name}" CR${leftPad(this.identifier, 2, "0")} is already sceduled, skipping...`
            );
            return;
        }
        this.isSceduled = true;
        const execute = async () => {
            if (this.isRunning) {
                console.warn(
                    `[CRON] Job "${this.name}" CR${leftPad(this.identifier, 2, "0")} is still running, skipping this interval`
                );
                return;
            }
            if (!this.isSceduled) {
                console.warn(
                    `[CRON] Job "${this.name}" CR${leftPad(this.identifier, 2, "0")} fired after closing time, cleaned up.`
                );
                return;
            }

            this.isRunning = true;
            const startTime = Date.now();

            try {
                await Promise.resolve(this.callback());
                this.lastRun = Date.now();
                const duration = this.lastRun - startTime;
                console.log(
                    `[CRON] ✓ "${this.name}" CR${leftPad(this.identifier, 2, "0")} completed in ${duration}ms`
                );
            } catch (error) {
                console.error(`[CRON] ✗ "${this.name}" CR${leftPad(this.identifier, 2, "0")} failed:`, error.message);
            } finally {
                this.isRunning = false;
                this.nextRun = Date.now() + this.intervalMs;
            }
        };

        // Run immediately on first schedule
        if (immediateExecute) {
            execute();
        }

        // Schedule subsequent runs
        const timer = setInterval(execute, this.intervalMs);
        this._setTimer(timer)
    }

    /**
     * Stop the cron job from executing further intervals
     */
    stop() {
        console.log(`[CRON] Stopped: "${this.name}" CR${leftPad(this.identifier, 2, "0")}`);
        this._stopTimer();
        this.isSceduled = false;
    }


    /**
     * Get the current status of this cron job
     * @returns {Object} Status object containing job details
     */
    getStatus() {
        return {
            name: this.name,
            interval: this.formatInterval(this.intervalMs),
            lastRun: this.lastRun ? new Date(this.lastRun).toLocaleString() : 'Never',
            nextRun: new Date(this.nextRun).toLocaleString(),
            isRunning: this.isRunning,
            identifier: this.identifier,
            parent: (this.owner == null ? null : (this.owner.name == undefined ? "NAMELESS" : this.owner.name))
        }
    }

    /**
     * Purge the cron job - stops execution and cleans up
     */
    purge() {
        this.stop()
    }

    /**
     * Set the interval timer for this job
     * @param {number} timer - The timer handle from setInterval
     * @private
     */
    _setTimer(timer) {
        if (this.timer != null) {
            clearInterval(this.timer)
        }
        this.timer = timer
    }

    /**
     * Stop and clear the interval timer
     * @private
     */
    _stopTimer() {
        if (this.timer != null) {
            clearInterval(this.timer)
        }
    }
}

module.exports = Cronjob;