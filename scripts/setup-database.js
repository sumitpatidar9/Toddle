const { Pool } = require("pg");
require("dotenv").config();

const setupDatabase = async () => {
	const pool = new Pool({
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	});

	try {
		console.log("Setting up database...");

		const fs = require("fs");
		const path = require("path");

		const schemaSQL = fs.readFileSync(
			path.join(__dirname, "../sql/schema.sql"),
			"utf8"
		);

		const statements = schemaSQL
			.split(';')
			.map(statement => statement.trim())
			.filter(statement => statement.length > 0);

		const client = await pool.connect();
		try {
			await client.query('BEGIN');

			for (const statement of statements) {
				try {
					await client.query(statement);
				} catch (err) {
					if (err.code !== '42710' && err.code !== '42P07') {
						console.warn('Warning during statement execution:', err.message);
					}
				}
			}

			await client.query('COMMIT');
			console.log("Database schema verified/created successfully");
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}

		console.log("Database setup completed successfully!");
	} catch (error) {
		console.error("Database setup failed!", error);
		process.exit(1);
	} finally {
		await pool.end();
	}
};

if (require.main === module) {
	setupDatabase();
}

module.exports = { setupDatabase };
