const { MongoClient } = require('mongodb');

module.exports = async function(connectionString) {
  const mongoClient = await MongoClient.connect(connectionString, {
    useUnifiedTopology: true,
  });
  const collection = mongoClient.db().collection('passwords');

  async function find(id) {
    const result = await collection.findOneAndDelete({ _id: id, expires: {$gt: new Date() }});
    return result.value
      ? result.value.data.buffer
      : '';
  }

  async function store(id, data, expires) {
    try {
      await collection.insertOne({
        _id: id,
        data,
        expires,
      });
    } catch (err) {
      if (err.code === 11000) {
        return false;
      }
      throw err;
    }
    return true;
  }

  async function disconnect() {
    await mongoClient.close();
  }

  return {
    find,
    store,
    disconnect,
  }
}
