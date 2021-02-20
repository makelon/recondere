const crypto = require('crypto'),
  http = require('http');
  ({ Client } = require('pg'));

const BASE64_REPLACEMENTS = {
    '+': '-',
    '/': '_',
  },
  DEFAULT_EXPIRATION = 60 * 60 * 24 * 1000,
  DEFAULT_PORT = 8080,
  HTTP_PAYLOAD_TOO_LARGE = 413,
  MAX_LENGTH = 1000;

let pgPersistent = false,
  pgClient;

function parseInput(str) {
  const [id, key, iv] = str.split(':');
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
    .replace(/[+\/]/g, c => BASE64_REPLACEMENTS[c]);
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
    throw new Error('Failed to decrypt data');
  } finally {
    await closePgClient();
  }
  return decrypted;
}

async function storeEncrypted(data, attempt) {
  let id, key, iv, encrypted;
  try {
    ({id, key, iv} = await cipherSetup());
    encrypted = await encrypt(data, key, iv);
  } catch (err) {
    console.log(err);
    throw new Error('Failed to encrypt data');
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
    throw err;
  } finally {
    await closePgClient();
  }
  return {
    id,
    key: bufferToUrlBase64(key),
    iv: bufferToUrlBase64(iv),
  };
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

function setupResponse(res) {
  if (!res.status) {
    res.status = status => {
      res.statusCode = status;
      return res;
    };
  }
  if (!res.send) {
    res.send = data => {
      res.end(data);
      return res;
    };
  }
  if (!res.sendStatus) {
    res.sendStatus = status => {
      res.statusCode = status;
      res.end();
      return res;
    }
  }
}

function setupRequest(req) {
  return new Promise((resolve, reject) => {
    req.body = '';
    req.on('data', data => {
      req.body += data;
    });
    req.on('end', data => {
      if (data) {
        req.body += data;
      }
      resolve();
    });
    req.on('error', err => {
      reject(err);
      req.close();
    });
  });
}

async function handler(req, res) {
  setupResponse(res);
  if (req.method === 'POST') {
    if (!req.hasOwnProperty('body')) {
      await setupRequest(req);
    }
    if (req.body.length > MAX_LENGTH) {
      return res.sendStatus(HTTP_PAYLOAD_TOO_LARGE);
    }
    try {
      const { id, key, iv } = await storeEncrypted(req.body);
      res.send(`${id}:${key.toString('base64')}:${iv.toString('base64')}`);
    } catch (err) {
      res.send(err.message);
    }
  } else if (req.method === 'GET') {
    const paramString = req.url[0] === '/' ? req.url.slice(1) : req.url;
    try {
      const decrypted = await readEncrypted(decodeURIComponent(paramString));
      res.send(decrypted && decrypted.toString());
    } catch (err) {
      res.status(400).send(err.message);
    }
  }
}

function start() {
  const server = http.createServer(handler);
  const port = process.env.PORT || DEFAULT_PORT
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = handler;

if (module === require.main) {
  pgPersistent = true;
  start();
}
