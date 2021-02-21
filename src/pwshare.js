const crypto = require('crypto'),
  { Client } = require('pg');

const BASE64_REPLACEMENTS = {
    '+': '-',
    '/': '_',
    '=': '',
  },
  DAY_TO_MILLISEC = 60 * 60 * 24 * 1000,
  DEFAULT_EXPIRATION = 1;

let pgPersistent = false,
  pgClient;

function parseInput(str) {
  const [id, key, iv] = str.split('.');
  if (iv === undefined) {
    throw new Error('Invalid input');
  }
  return {
    id,
    key: Buffer.from(key, 'base64'),
    iv: Buffer.from(iv, 'base64'),
  };
}

function bufferToUrlBase64(buf) {
  return buf.toString('base64')
    .replace(/[+\/=]/g, c => BASE64_REPLACEMENTS[c]);
}

async function readEncrypted(input) {
  let id, key, iv, decrypted;
  try {
    ({id, key, iv} = parseInput(input));
    const result = await query('SELECT data from passwords where id = $1 and expires > $2', [id, new Date()]);
    await query('DELETE FROM passwords WHERE id = $1', [id]);
    const encrypted = result.rows.length
      ? result.rows[0].data
      : '';
    decrypted = await decrypt(encrypted, key, iv);
  } catch (err) {
    console.log(err);
    throw new Error('Failed to decrypt data');
  } finally {
    await closePgClient();
  }
  return decrypted;
}

async function storeEncrypted(data, ttl, attempt) {
  let id, key, iv, encrypted;
  try {
    ({id, key, iv} = await cipherSetup());
    encrypted = await encrypt(data, key, iv);
  } catch (err) {
    console.log(err);
    throw new Error('Failed to encrypt data');
  }

  try {
    if (!ttl) {
      ttl = DEFAULT_EXPIRATION;
    }
    const expires = new Date(Date.now() + ttl * DAY_TO_MILLISEC);
    await query('INSERT INTO passwords (id, data, expires) VALUES ($1, $2, $3)', [id, encrypted, expires]);
  } catch (err) {
    if (err.code === '23505') {
      if (attempt === undefined) {
        attempt = 0;
      } else if (attempt >= 5) {
        throw new Error('Failed to find unique ID for encrypted data');
      }
      return storeEncrypted(data, ttl, ++attempt);
    }
    throw err;
  } finally {
    await closePgClient();
  }
  return `${id}.${bufferToUrlBase64(key)}.${bufferToUrlBase64(iv)}`
}

function setPersistent(persistent) {
  pgPersistent = persistent;
}

async function query(...args) {
  const client = await getPgClient();
  return await client.query(...args);
}

async function getPgClient() {
  if (!pgClient) {
    pgClient = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    await pgClient.connect();
  }
  return pgClient;
}

async function closePgClient() {
  if (pgClient && !pgPersistent) {
    await pgClient.end();
  }
}

function cipherSetup(data, key, iv) {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (err) {
        reject(err);
      }
      resolve({
        iv: buf.slice(0, 16),
        key: buf.slice(16, 48),
        id: buf.slice(48).toString('hex'),
      });
    });
  });
}

function encrypt(data, key, iv) {
  const cipher = crypto.createCipheriv('aes256', key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

function decrypt(data, key, iv) {
  const decipher = crypto.createDecipheriv('aes256', key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

module.exports = {
  readEncrypted,
  storeEncrypted,
  setPersistent,
};
