export interface IStorageDriver {
	find(id: string): Promise<Uint8Array>;
	store(id: string, data: Uint8Array, expires: Date): Promise<boolean>;
	remove(id: string): Promise<number>;
	removeExpired(): Promise<number>;
	disconnect(): Promise<void>;
}
