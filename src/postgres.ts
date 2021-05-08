import { Client as PgClientType } from 'pg';

import type { IStorage } from './storage';

let PgClient: typeof PgClientType;

try {
	PgClient = require('pg').Client;
} catch (err) {
	throw new Error('Cannot import pg module.');
}

export async function createClient(connectionString: string): Promise<IStorage> {
	const pgClient = new PgClient(connectionString);
	await pgClient.connect();

	async function find(id: string) {
		const result = await pgClient.query<{ data: Buffer }>('SELECT data from passwords where id = $1 and expires > $2', [id, new Date()]);
		await pgClient.query('DELETE FROM passwords WHERE id = $1', [id]);
		if (!result.rows[0]) {
			throw new Error('Not found');
		}
		return result.rows[0].data
	}

	async function store(id: string, data: Buffer, expires: Date) {
		try {
			await pgClient.query('INSERT INTO passwords (id, data, expires) VALUES ($1, $2, $3)', [id, data, expires]);
		} catch (err: unknown) {
			if ((err as NodeJS.ErrnoException).code === '23505') {
				// Row with this id already exists
				return false;
			}
			throw err;
		}
		return true;
	}

	async function remove(id: string): Promise<number> {
		const result = await pgClient.query('DELETE FROM passwords WHERE id = $1', [id]);
		return result.rowCount;
	}

	async function removeExpired(): Promise<number> {
		const result = await pgClient.query('DELETE FROM passwords WHERE expires < $1', [new Date()]);
		return result.rowCount;
	}

	async function disconnect() {
		await pgClient.end();
	}

	return {
		find,
		store,
		remove,
		removeExpired,
		disconnect,
	};
}
