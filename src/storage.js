const { dbHost, dbName, dbParams, dbPassword, dbScheme, dbUsername } = require('./config');

let client = null;

async function connect() {
	if (!client) {
		const connectionString = `${dbScheme}://${dbUsername}:${dbPassword}@${dbHost}/${dbName}${dbParams}`;
		try {
			if (dbScheme.startsWith('postgres')) {
				client = await require('./postgres').createClient(connectionString);
			} else if (dbScheme.startsWith('mongodb')) {
				client = await require('./mongodb').createClient(connectionString);
			}
		} catch (err) {
			console.error(`Failed to import storage module: ${err.message}`);
			process.exit(1);
		}
	}
}

async function find(id) {
	await connect();
	return client.find(id);
}

async function store(id, data, expires) {
	await connect();
	return client.store(id, data, expires);
}

async function disconnect() {
	if (client) {
		await client.disconnect();
		client = null;
	}
}

module.exports = {
	disconnect,
	find,
	store,
};
