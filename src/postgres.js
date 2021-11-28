const { Client } = require('pg');

module.exports = async function(connectionString) {
  const pgClient = new Client(connectionString);
  await pgClient.connect();

  async function query(...args) {
    return await pgClient.query(...args);
  }

  async function find(id) {
    const result = await query('SELECT data from passwords where id = $1 and expires > $2', [id, new Date()]);
    await query('DELETE FROM passwords WHERE id = $1', [id]);
    return result.rows.length
      ? result.rows[0].data
      : '';
  }

  async function store(id, data, expires, attempt) {
    try {
      await query('INSERT INTO passwords (id, data, expires) VALUES ($1, $2, $3)', [id, data, expires]);
    } catch (err) {
      if (err.code === '23505') {
        return false;
      }
      throw err;
    }
    return true;
  }

  async function disconnect() {
    await pgClient.end();
  }

  return {
    find,
    store,
    disconnect,
  };
}
