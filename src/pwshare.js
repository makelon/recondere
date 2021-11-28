const crypto = require('crypto'),
  { find, store } = require('./storage');

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
    const encrypted = await find(id);
    decrypted = decrypt(encrypted, key, iv);
  } catch (err) {
    console.log(err);
    throw new Error('Failed to decrypt data');
  }
  return decrypted;
}

async function storeEncrypted(data, ttl, attempt) {
  let id, key, iv, encrypted;
  try {
    ({id, key, iv} = await cipherSetup());
    encrypted = encrypt(data, key, iv);
  } catch (err) {
    console.log(err);
    throw new Error('Failed to encrypt data');
  }

  if (!ttl) {
    ttl = DEFAULT_EXPIRATION;
  }
  const expires = new Date(Date.now() + ttl * DAY_TO_MILLISEC);
  const stored = await store(id, encrypted, expires);
  if (!stored) {
    if (attempt === undefined) {
      attempt = 0;
    } else if (attempt >= 5) {
      throw new Error('Failed to find unique ID for encrypted data');
    }
    return await storeEncrypted(data, ttl, ++attempt);
  }
  return `${id}.${bufferToUrlBase64(key)}.${bufferToUrlBase64(iv)}`
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
};
