export class ConflictError extends Error {
	public readonly field: string;

	constructor(message: string, field: string) {
		super(message);
		this.name = 'Conflict Error';
		this.field = field;
	}
}