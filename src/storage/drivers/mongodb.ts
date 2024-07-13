import { Binary, Collection, MongoClient, MongoError } from 'mongodb';

import { IStorageDriver } from './storage-driver';

interface CollectionSchema {
	_id: string;
	data: Binary;
	expires: Date;
}

class StorageDriverMongo implements IStorageDriver {
	readonly #collection: Collection<CollectionSchema>;
	readonly #mongoClient: MongoClient;

	constructor(mongoClient: MongoClient) {
		this.#collection = mongoClient.db().collection('passwords');
		this.#mongoClient = mongoClient;
	}

	public async find(id: string) {
		const result = await this.#collection.findOneAndDelete({
			_id: id,
			expires: { $gt: new Date() },
		});
		if (!result) {
			throw new Error('Not found');
		}
		return result.data.buffer;
	}

	public async store(id: string, data: Uint8Array, expires: Date) {
		try {
			await this.#collection.insertOne({
				_id: id,
				data: new Binary(data),
				expires,
			});
		} catch (err: unknown) {
			if (err instanceof MongoError && err.code === 11000) {
				// Document with this _id already exists
				return false;
			}
			throw err;
		}
		return true;
	}

	public async remove(id: string) {
		const result = await this.#collection.deleteOne({ _id: id });
		return result.deletedCount || 0;
	}

	public async removeExpired() {
		const result = await this.#collection.deleteMany({ expires: { $lt: new Date() } });
		return result.deletedCount || 0;
	}

	public async disconnect() {
		await this.#mongoClient.close();
	}
}

export async function createStorageDriver(connectionString: string): Promise<IStorageDriver> {
	const mongoClient = await MongoClient.connect(connectionString);

	return new StorageDriverMongo(mongoClient);
}
