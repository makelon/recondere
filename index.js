const crypto = require('crypto');
const { Client } = require('pg');

const DEFAULT_EXPIRATION = 60 * 60 * 24 * 1000;

let pgClient;

async function readEncrypted(input) {
  const [id, key, iv] = input.split(':');
  let decrypted;
  try {
    const result = await query('SELECT data from passwords where id = $1 and expires > $2', [id, new Date()]);
    await query('DELETE FROM passwords WHERE id = $1', [id]);
    const encrypted = result.rows.length
      ? result.rows[0].data
      : '';
    decrypted = await decrypt(encrypted, Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
  } catch (err) {
    console.log('Failed to decrypt data');
  } finally {
    await closePgClient();
  }
  return decrypted;
}

async function storeEncrypted(data, attempt) {
  let id, key, iv, encrypted;
  try {
    [id, key, iv] = await cipherSetup();
    encrypted = await encrypt(data, key, iv);
  } catch (err) {
    console.log('Failed to encrypt data');
    console.log(err);
  }

  try {
    await query('INSERT INTO passwords (id, data, expires) VALUES ($1, $2, $3)', [id, encrypted, new Date(Date.now() + DEFAULT_EXPIRATION)]);
  } catch (err) {
    if (err.code === '23505') {
      if (attempt === undefined) {
        attempt = 0;
      } else if (attempt >= 5) {
        throw new Error('Failed to find unique ID for encrypted data');
      }
      return storeEncrypted(data, ++attempt);
    }
    console.log(err);
  } finally {
    await closePgClient();
  }
  return [id, key, iv];
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
  if (pgClient) {
    await pgClient.end();
  }
}

function cipherSetup(data, key, iv) {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(60, (err, buf) => {
      if (err) {
        reject(err);
      }
      const iv = buf.slice(0, 16),
        key = buf.slice(16, 48),
        idLength = 17 + (buf[buf.length - 1] & 0x7),
        id = buf.slice(48).toString('hex').slice(0, idLength);
      
      resolve([id, key, iv]);
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

if (process.argv[2] === 'd') {
  readEncrypted(process.argv[3]).then(decrypted => {
    if (decrypted) {
      console.log(decrypted.toString());
    }
  });
} else if (process.argv[2] === 'c') {
  storeEncrypted(process.argv[3]).then(([id, key, iv]) => {
    console.log(`${id}:${key.toString('base64')}:${iv.toString('base64')}`);
  });
}
