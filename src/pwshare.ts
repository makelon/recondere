import crypto from 'crypto';

import { find, remove, store } from './storage';

const BASE64_REPLACEMENTS = {
	'+': '-',
	'/': '_',
	'=': '',
};
const DAY_TO_MILLISEC = 60 * 60 * 24 * 1000;
const DEFAULT_EXPIRATION = 1;

function parseInput(input: string) {
	const [id, key, iv] = input.split('.');
	if (iv === undefined) {
		throw new Error('Invalid input');
	}
	return {
		id: id as string,
		key: Buffer.from(key as string, 'base64'),
		iv: Buffer.from(iv, 'base64'),
	};
}

function bufferToUrlBase64(buf: Buffer) {
	return buf.toString('base64')
		.replace(/[+\/=]/g, char => BASE64_REPLACEMENTS[char as keyof typeof BASE64_REPLACEMENTS]);
}

async function cipherSetup(): Promise<{ iv: Buffer, key: Buffer, id: string }> {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(64, (err, buf) => {
			if (err) {
				reject(err);
			} else {
				resolve({
					iv: buf.slice(0, 16),
					key: buf.slice(16, 48),
					id: buf.slice(48).toString('hex'),
				});
			}
		});
	});
}

async function encrypt(data: string) {
	try {
		const { id, key, iv } = await cipherSetup();
		const cipher = crypto.createCipheriv('aes256', key, iv);
		return {
			id,
			key,
			iv,
			encrypted: Buffer.concat([cipher.update(data), cipher.final()]),
		};
	} catch (err) {
		console.log(err);
		throw new Error('Failed to encrypt data');
	}
}

function decrypt(data: Buffer, key: Buffer, iv: Buffer): Buffer {
	const decipher = crypto.createDecipheriv('aes256', key, iv);
	return Buffer.concat([decipher.update(data), decipher.final()]);
}

export async function removeEncrypted(id: string): Promise<void> {
	const numRemoved = await remove(id);
	if (numRemoved > 0) {
		console.log(`Removed ${numRemoved} records`);
	}
}

export async function readEncrypted(input: string): Promise<string> {
	try {
		const { id, key, iv } = parseInput(input);
		const encrypted = await find(id);
		return decrypt(encrypted, key, iv).toString();
	} catch (err) {
		throw new Error('Failed to decrypt data');
	}
}

export async function storeEncrypted(data: string, ttl: number, attempt?: number): Promise<string> {
	const { id, key, iv, encrypted } = await encrypt(data);
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
		return storeEncrypted(data, ttl, ++attempt);
	}
	return `${id}.${bufferToUrlBase64(key)}.${bufferToUrlBase64(iv)}`;
}
