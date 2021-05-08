import { Binary, MongoClient as MongoClientType, MongoError } from 'mongodb';

import type { IStorage } from './storage';

let MongoClient: typeof MongoClientType;

interface CollectionSchema {
	_id: string;
	data: Binary;
	expires: Date;
}

try {
	({ MongoClient } = require('mongodb'));
} catch (err) {
	throw new Error('Cannot import mongodb module.');
}

export async function createClient(connectionString: string): Promise<IStorage> {
	const mongoClient = await MongoClient.connect(connectionString, {
		useUnifiedTopology: true,
	});
	const collection = mongoClient.db().collection<CollectionSchema>('passwords');

	async function find(id: string) {
		const result = await collection.findOneAndDelete({
			_id: id,
			expires: { $gt: new Date() },
		});
		if (!result.value) {
			throw new Error('Not found');
		}
		return result.value.data.buffer;
	}

	async function store(id: string, data: Buffer, expires: Date) {
		try {
			await collection.insertOne({
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

	async function remove(id: string): Promise<number> {
		const result = await collection.deleteOne({ _id: id });
		return result.deletedCount || 0;
	}

	async function removeExpired(): Promise<number> {
		const result = await collection.deleteMany({ expires: { $lt: new Date() } });
		return result.deletedCount || 0;
	}

	async function disconnect() {
		await mongoClient.close();
	}

	return {
		find,
		store,
		remove,
		removeExpired,
		disconnect,
	}
}
