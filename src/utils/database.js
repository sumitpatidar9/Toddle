const { Pool } = require("pg");
const logger = require("./logger");

let pool;

const initializePool = () => {
	if (!pool) {
		pool = new Pool({
		connectionString: process.env.DATABASE_URL, // Use DATABASE_URL
		ssl: {
		  rejectUnauthorized: false, // Required for Render
		},
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	  });

		pool.on("error", (err) => {
			logger.critical("Unexpected error on idle client", err);
		});
	}
	return pool;
};

const connectDB = async () => {
	try {
		const dbPool = initializePool();
		const client = await dbPool.connect();
		logger.verbose("Connected to PostgreSQL database");
		client.release();
	} catch (error) {
		logger.critical("Failed to connect to database:", error);
		throw error;
	}
};

const query = async (text, params = []) => {
	const dbPool = initializePool();
	const start = Date.now();

	try {
		const result = await dbPool.query(text, params);
		const duration = Date.now() - start;
		logger.verbose("Executed query", {
			text,
			duration,
			rows: result.rowCount,
		});
		return result;
	} catch (error) {
		logger.critical("Database query error:", error);
		throw error;
	}
};

const getClient = async () => {
	const dbPool = initializePool();
	return await dbPool.connect();
};

module.exports = {
	connectDB,
	query,
	getClient,
};


