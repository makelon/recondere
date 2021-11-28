//const createPgClient = require('./postgres');
const createMongoClient = require('./mongodb');
const { dbHost, dbName, dbParams, dbPassword, dbScheme, dbUsername } = require('./config');

let client = null;

async function connect() {
  if (!client) {
    const connectionString = `${dbScheme}://${dbUsername}:${dbPassword}@${dbHost}/${dbName}${dbParams}`;
    if (dbScheme.startsWith('postgres')) {
      client = await createPgClient(connectionString);
    }
    else if (dbScheme.startsWith('mongodb')) {
      client = await createMongoClient(connectionString);
    }
  }
  return client;
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
  connect,
  disconnect,
  find,
  store,
};
