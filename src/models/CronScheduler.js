const Cronjob = require("./Cronjob")

/**
 * Background cron job scheduler for Electron main process
 * Register your periodic tasks here
 */

class CronScheduler {
    // TODO: method comments
    // TODO: remove unused / outdated methods
    constructor() {
        this.identifier = 0;
        this.jobs = [];
        this.timers = [];
    }

    _freeIdentifier() {
        this.identifier++;
        return this.identifier - 1;
    }

    /**
     * Schedule a new background job
     * @param {string} name - Job identifier
     * @param {number} intervalMs - Interval in milliseconds
     * @param {Function} callback - Async function to execute
     * @param {any} owner - An object that claims responsability over a Cron. Allows CronScheduler to kill all child Crons.
     * @returns {this} - For chaining
     */
    schedule(name = null, intervalMs = 30 * 1000, callback = null, owner = null) {
        let identifier = this._freeIdentifier();
        let cron = new Cronjob(name, intervalMs, callback, null, null, false, false, owner, identifier);
        this.jobs.push(cron);
        console.log(`[CRON] Scheduled: "${name}" (every ${cron.formatInterval(intervalMs)})`);
        return this;
    }

    /**
     * Start all scheduled jobs
     */
    startAll() {
        console.log(`[CRON] Starting ${this.jobs.length} job(s)...`);

        this.jobs.forEach((job) => {
            job.start();
        });
    }

    /**
     * Stop all jobs
     */
    stopAll() {
        console.log(`[CRON] Stopping all jobs...`);
        this.timers.forEach((timer) => clearInterval(timer));
        this.timers = [];
        this.jobs = [];
    }

    stopByOwner() {
        // TODO: finish
    }

    stopById() {
        // TODO: finish
    }

    startById() {
        // TODO: finish
    }

    /**
     * Get job status's
     */
    getAllStatus() {
        return this.jobs.map((job) => job.getStatus());
    }
}

module.exports = new CronScheduler();
