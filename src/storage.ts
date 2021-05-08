import { dbHost, dbName, dbParams, dbPassword, dbScheme, dbUsername } from './config';

export interface IStorage {
	find(id: string): Promise<Buffer>;
	store(id: string, data: Buffer, expires: Date): Promise<boolean>;
	remove(id: string): Promise<number>;
	removeExpired(): Promise<number>;
	disconnect(): Promise<void>;
}

interface StorageModule {
	createClient(connectionString: string): Promise<IStorage>
}

let client: IStorage | null = null;

async function connect(): Promise<void> {
	if (!client) {
		const connectionString = `${dbScheme}://${dbUsername}:${dbPassword}@${dbHost}/${dbName}${dbParams}`;
		try {
			let storageModule: StorageModule;
			if (dbScheme.startsWith('postgres')) {
				storageModule = await import('./postgres');
			} else if (dbScheme.startsWith('mongodb')) {
				storageModule = await import('./mongodb');
			} else {
				throw new Error(`Unknown storage module: ${dbScheme}`);
			}
			client = await storageModule.createClient(connectionString);
		} catch (err) {
			console.error(`Failed to import storage module: ${err.message}`);
			process.exit(1);
		}
	}
}

export async function find(id: string): Promise<Buffer> {
	await connect();
	return client!.find(id);
}

export async function store(id: string, data: Buffer, expires: Date): Promise<boolean> {
	await connect();
	return client!.store(id, data, expires);
}

export async function remove(id: string): Promise<number> {
	await connect();
	return id === ''
		? await client!.removeExpired()
		: await client!.remove(id);
}

export async function disconnect(): Promise<void> {
	if (client) {
		await client.disconnect();
		client = null;
	}
}
