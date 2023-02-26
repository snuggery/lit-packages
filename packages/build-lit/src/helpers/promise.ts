export class Deferred<T> extends Promise<T> {
	static [Symbol.species] = Promise;

	public readonly resolve: (value: T | PromiseLike<T>) => void;
	public readonly reject: (error: unknown) => void;

	public constructor() {
		let resolve: this['resolve'], reject: this['reject'];

		super((res, rej) => {
			resolve = res;
			reject = rej;
		});

		this.resolve = resolve!;
		this.reject = reject!;
	}
}
