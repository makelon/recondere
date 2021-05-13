import Application from '../application';

export default class CliHandler {
	readonly #application: Application;

	constructor(application: Application) {
		this.#application = application;
	}

	private async readEncrypted(parameter?: string): Promise<void> {
		if (!parameter) {
			console.error('Missing required parameter.');
			this.printUsage();
			process.exit(1);
		}
		console.log(await this.#application.readEncrypted(parameter));
	}

	private async removeEncrypted(parameter?: string): Promise<void> {
		const numRemoved = await this.#application.removeEncrypted(parameter);
		console.log(`Removed ${numRemoved} records`);
	}

	private async storeEncrypted(data?: string, ttl?: number): Promise<void> {
		if (!data) {
			console.error('Missing required parameter.');
			this.printUsage();
			process.exit(1);
		}
		if (ttl !== undefined && (!Number.isInteger(ttl) || ttl < 0)) {
			console.error('TTL must be a positive integer.');
			this.printUsage();
			process.exit(1);
		}
		console.log(await this.#application.storeEncrypted(data, ttl));
	}

	private printUsage(): void {
		console.log(
`Available operations:
  delete [id]               Remove specified record or clear expired records if <id> is ommitted
  read <params>             Decrypt specified record
  create <content> [ttl]    Create new record`
		);
	}

	public async handle(): Promise<void> {
		const operation = process.argv[2];
		const parameter = process.argv[3];
		try {
			switch (operation) {
				case 'read':
					await this.readEncrypted(parameter);
					break;
				case 'delete':
					await this.removeEncrypted(parameter);
					break;
				case 'create':
					const ttl = process.argv[4] ? Number(process.argv[4]) : undefined;
					await this.storeEncrypted(parameter, ttl);
					break;
				case 'help':
					this.printUsage();
					break;
				default:
					console.error('Unknown operation.');
					this.printUsage();
			}
		} catch (err) {
			console.error(err.message);
		} finally {
			await this.#application.close();
		}
	}
}
