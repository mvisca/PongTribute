export class NotFoundError extends Error {
	public readonly resource: string;

	constructor(message: string, resource: string) {
		super(message);
		this.name = 'NotFoundError';
		this.resource = resource;
	}
}