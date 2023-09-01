import crypto from 'crypto';

import { IStorageClient } from './storage/storage-client';

const BASE64_REPLACEMENTS = {
	'+': '-',
	'/': '_',
	'=': '',
};
const DAY_TO_MILLISEC = 60 * 60 * 24 * 1000;
const DEFAULT_EXPIRATION = 1;

interface SecretParams {
	iv: Buffer;
	key: Buffer;
	id: string;
}

interface Secret extends SecretParams {
	encrypted: Uint8Array;
}

export default class Application {
	readonly #storageClient: IStorageClient;

	constructor(storageClient: IStorageClient) {
		this.#storageClient = storageClient;
	}

	private static parseInput(input: string): SecretParams {
		const [id, key, iv] = input.split('.');
		if (!iv || !key || !id) {
			throw new Error('Invalid input');
		}
		return {
			id,
			key: Buffer.from(key, 'base64'),
			iv: Buffer.from(iv, 'base64'),
		};
	}

	private static bufferToUrlBase64(buf: Buffer): string {
		return buf.toString('base64')
			.replace(/[+\/=]/g, char => BASE64_REPLACEMENTS[char as keyof typeof BASE64_REPLACEMENTS]);
	}

	private static cipherSetup(): Promise<SecretParams> {
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

	private static async encrypt(data: string): Promise<Secret> {
		try {
			const { id, key, iv } = await Application.cipherSetup();
			const cipher = crypto.createCipheriv('aes256', key, iv);
			return {
				id,
				key,
				iv,
				encrypted: Buffer.concat([cipher.update(data), cipher.final()]),
			};
		} catch (err) {
			throw new Error('Failed to encrypt data');
		}
	}

	private static decrypt(data: Uint8Array, key: Buffer, iv: Buffer): Uint8Array {
		const decipher = crypto.createDecipheriv('aes256', key, iv);
		return Buffer.concat([decipher.update(data), decipher.final()]);
	}

	public async removeEncrypted(id?: string): Promise<number> {
		return this.#storageClient.remove(id);
	}

	public async readEncrypted(input: string): Promise<string> {
		try {
			const { id, key, iv } = Application.parseInput(input);
			const encrypted = await this.#storageClient.find(id);
			return Application.decrypt(encrypted, key, iv).toString();
		} catch (err) {
			throw new Error('Failed to decrypt data');
		}
	}

	public async storeEncrypted(data: string, ttl?: number, attempt?: number): Promise<string> {
		const { id, key, iv, encrypted } = await Application.encrypt(data);
		if (!ttl) {
			ttl = DEFAULT_EXPIRATION;
		}
		const expires = new Date(Date.now() + ttl * DAY_TO_MILLISEC);
		const stored = await this.#storageClient.store(id, encrypted, expires);
		if (!stored) {
			if (attempt === undefined) {
				attempt = 0;
			} else if (attempt >= 5) {
				throw new Error('Failed to find unique ID for encrypted data');
			}
			return this.storeEncrypted(data, ttl, ++attempt);
		}
		return `${id}.${Application.bufferToUrlBase64(key)}.${Application.bufferToUrlBase64(iv)}`;
	}

	public close(): Promise<void> {
		return this.#storageClient.disconnect();
	}
}
