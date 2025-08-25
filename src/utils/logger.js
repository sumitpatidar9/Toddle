const LOG_LEVELS = {
	VERBOSE: "verbose",
	CRITICAL: "critical",
};

const currentLogLevel = process.env.LOG_LEVEL || LOG_LEVELS.VERBOSE;

const verbose = (...args) => {
	if (currentLogLevel === LOG_LEVELS.VERBOSE) {
		console.log("[VERBOSE]", new Date().toISOString(), ...args);
	}
};

const critical = (...args) => {
	console.error("[CRITICAL]", new Date().toISOString(), ...args);
};

module.exports = {
	verbose,
	critical,
	LOG_LEVELS,
};
