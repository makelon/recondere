import { dbHost, dbName, dbParams, dbPassword, dbScheme, dbUsername } from '../config';
import { IStorageDriver } from './drivers/storage-driver';

export interface IStorageClient {
	find(id: string): Promise<Buffer>;
	store(id: string, data: Buffer, expires: Date): Promise<boolean>;
	remove(id?: string): Promise<number>;
	disconnect(): Promise<void>;
}

class StorageClient implements IStorageClient {
	readonly #storageDriver: IStorageDriver;

	public constructor(storageDriver: IStorageDriver) {
		this.#storageDriver = storageDriver;
	}

	public async find(id: string) {
		return this.#storageDriver.find(id);
	}

	public async store(id: string, data: Buffer, expires: Date) {
		return this.#storageDriver.store(id, data, expires);
	}

	public async remove(id?: string) {
		return id
			? await this.#storageDriver.remove(id)
			: await this.#storageDriver.removeExpired();
	}

	public async disconnect() {
		await this.#storageDriver.disconnect();
	}
}

interface StorageModule {
	createStorageDriver(connectionString: string): Promise<IStorageDriver>;
}

function getStorageModule(): Promise<StorageModule> {
	try {
		if (dbScheme.startsWith('postgres')) {
			return import('./drivers/postgres');
		} else if (dbScheme.startsWith('mongodb')) {
			return import('./drivers/mongodb');
		} else {
			throw new Error(`Unknown storage module: ${dbScheme}`);
		}
	} catch (err) {
		throw new Error(`Failed to import storage module: ${err.message}`);
	}
}

export async function getStorageClient(): Promise<IStorageClient> {
	const storageModule = await getStorageModule();
	const connectionString = `${dbScheme}://${dbUsername}:${dbPassword}@${dbHost}/${dbName}${dbParams}`;
	try {
		const storageDriver = await storageModule.createStorageDriver(connectionString);
		return new StorageClient(storageDriver);
	} catch (err) {
		throw new Error(`Failed to create storage client: ${err.message}`);
	}
}
