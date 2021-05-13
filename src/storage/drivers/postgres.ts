import { Client } from 'pg';

import { IStorageDriver } from './storage-driver';

class StorageDriverPg implements IStorageDriver {
	readonly #pgClient: Client;

	constructor(pgClient: Client) {
		this.#pgClient = pgClient;
	}

	public async find(id: string) {
		const result = await this.#pgClient.query<{ data: Buffer }>('SELECT data from passwords where id = $1 and expires > $2', [id, new Date()]);
		await this.#pgClient.query('DELETE FROM passwords WHERE id = $1', [id]);
		if (!result.rows[0]) {
			throw new Error('Not found');
		}
		return result.rows[0].data
	}

	public async store(id: string, data: Buffer, expires: Date) {
		try {
			await this.#pgClient.query('INSERT INTO passwords (id, data, expires) VALUES ($1, $2, $3)', [id, data, expires]);
		} catch (err: unknown) {
			if ((err as NodeJS.ErrnoException).code === '23505') {
				// Row with this id already exists
				return false;
			}
			throw err;
		}
		return true;
	}

	public async remove(id: string) {
		const result = await this.#pgClient.query('DELETE FROM passwords WHERE id = $1', [id]);
		return result.rowCount;
	}

	public async removeExpired() {
		const result = await this.#pgClient.query('DELETE FROM passwords WHERE expires < $1', [new Date()]);
		return result.rowCount;
	}

	public async disconnect() {
		await this.#pgClient.end();
	}
}

export async function createStorageDriver(connectionString: string): Promise<IStorageDriver> {
	const pgClient = new Client(connectionString);
	await pgClient.connect();

	return new StorageDriverPg(pgClient);
}
