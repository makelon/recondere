export interface IStorageDriver {
	find(id: string): Promise<Buffer>;
	store(id: string, data: Buffer, expires: Date): Promise<boolean>;
	remove(id: string): Promise<number>;
	removeExpired(): Promise<number>;
	disconnect(): Promise<void>;
}
