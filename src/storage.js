const { MongoClient } = require('mongodb');
const { dbHost, dbName, dbUsername, dbPassword } = require('./config');

let client;

async function connect() {
  if (!client) {
    const url = `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`;
    client = await MongoClient.connect(url);
  }
  return client;  
}

async function find(filter) {
  await connect();
}

async function insert(document) {
  await connect();
}

module.exports = {
  connect,
  find,
  insert,
};
