const crypto = require('crypto'),
  http = require('http');
  ({ Client } = require('pg'));

const BASE64_REPLACEMENTS = {
    '+': '-',
    '/': '_',
  },
  DAY_TO_MILLISEC = 60 * 60 * 24 * 1000,
  DEFAULT_EXPIRATION = 1,
  DEFAULT_PORT = 8080,
  HTTP_PAYLOAD_TOO_LARGE = 413,
  MAX_LENGTH = 1000;

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

function parseRequest(req) {
  if (req.get('content-type') === 'application/json') {
    try {
      const { ttl, data } = JSON.parse(req.body);
      return {
        data,
        ttl: Math.min(ttl, 30),
      };
    } catch (err) {
      console.log(err);
    }
  } else {
    return { data: req.body, ttl: false };
  }
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function setupRequest(req) {
  req.get = header => req.headers[header];
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
      return res.status(HTTP_PAYLOAD_TOO_LARGE)
        .send(`Content exceeds maximum allowed size of ${MAX_LENGTH} bytes`);
    }
    try {
      const { ttl, data } = parseRequest(req);
      const { id, key, iv } = await storeEncrypted(data, ttl);
      res.send(`${id}.${key.toString('base64')}.${iv.toString('base64')}`);
    } catch (err) {
      console.log(err);
      res.send(err.message);
    }
  } else if (req.method === 'GET') {
    const paramString = req.url[0] === '/' ? req.url.slice(1) : req.url;
    try {
      const decrypted = await readEncrypted(decodeURIComponent(paramString));
      res.send(decrypted && decrypted.toString());
    } catch (err) {
      console.log(err);
      res.status(400).send(err.message);
    }
  } else if (req.method === 'OPTIONS') {
    res.end();
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
