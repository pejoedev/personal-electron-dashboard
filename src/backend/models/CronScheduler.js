const Cronjob = require("./Cronjob")


/**
 * Manages scheduling and execution of multiple cron jobs
 */
class CronScheduler {
    /**
     * Create a new CronScheduler instance
     */
    constructor() {
        this.identifier = 0;
        this.jobs = [];
        this.timers = [];
        this._freeIdentifier()
    }

    /**
     * Get the next available job identifier and increment the counter
     * @returns {number} The next available identifier
     * @private
     */
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
        return this;
    }

    /**
     * Start all scheduled cron jobs
     */
    startAll(immediateExecute = false) {
        console.log(`[CRON] Starting ${this.jobs.length} job(s)...`);

        this.jobs.forEach((job) => {
            job.start(immediateExecute);
        });
    }

    /**
     * Stop all cron jobs
     * @param {boolean} deleteCron - Whether to remove the jobs from the scheduler (default: false)
     */
    stopAll(deleteCron = false) {
        this.jobs = this.jobs.filter((job) => {
            job.stop();
            return !deleteCron;
        });
    }

    /**
     * Stop all cron jobs owned by a specific owner
     * @param {any} owner - The owner object to match
     * @param {boolean} deleteCron - Whether to remove the jobs from the scheduler (default: false)
     */
    stopByOwner(owner, deleteCron = false) {
        this.jobs = this.jobs.filter((job) => {
            if (job.owner == owner) {
                job.stop();
                return !deleteCron;
            }
            return true;
        });
    }

    /**
     * Stop a specific cron job by its identifier
     * @param {number} identifier - The job identifier to stop
     * @param {boolean} deleteCron - Whether to remove the job from the scheduler (default: false)
     */
    stopById(identifier, deleteCron = false) {
        this.jobs = this.jobs.filter((job) => {
            if (job.identifier == identifier) {
                job.stop();
                return !deleteCron;
            }
            return true;
        });
    }

    /**
     * Start all cron jobs owned by a specific owner
     * @param {any} owner - The owner object to match
     */
    startByOwner(owner, immediateExecute = false) {
        this.jobs.forEach((job) => {
            if (job.owner == owner) {
                job.start(immediateExecute);
            }
        });
    }

    /**
     * Start a specific cron job by its identifier
     * @param {number} identifier - The job identifier to start
     */
    startById(identifier, immediateExecute = false) {
        this.jobs.forEach((job) => {
            if (job.identifier == identifier) {
                job.start(immediateExecute);
            }
        });
    }

    /**
     * Get status information for all scheduled cron jobs
     * @returns {Array} Array of status objects for each job
     */
    getAllStatus() {
        return this.jobs.map((job) => job.getStatus());
    }
}

module.exports = new CronScheduler();
