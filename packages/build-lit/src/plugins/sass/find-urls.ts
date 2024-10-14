/*
 * Heavily influenced by `@angular/build`'s sass resolvers
 */

// https://www.w3.org/TR/css-syntax-3/#newline
function isNewline(code: number) {
	return (
		code === 0x0a || // \n
		code === 0x0c || // \f
		code === 0x0d // \r
	);
}

// https://www.w3.org/TR/css-syntax-3/#whitespace
function isWhitespace(code: number) {
	return (
		code === 0x09 || // tab
		code === 0x20 || // space
		isNewline(code)
	);
}

function isQuote(code: number): boolean {
	return (
		code === 0x22 || // "
		code === 0x27 // '
	);
}

function isSurrogate(code: number) {
	return (
		(code >= 0xd800 && code <= 0xdbff) || // starting surrogate
		(code >= 0xdc00 && code <= 0xdfff) // trailing surrogate
	);
}

function isHex(code: number) {
	return (
		(code >= 0x30 && code <= 0x39) || // digit
		(code >= 0x41 && code <= 0x46) || // A-F
		(code >= 0x61 && code <= 0x66) // a-f
	);
}

const EOF = -1;
const ESCAPE = 0x5c;

// https://www.w3.org/TR/css-syntax-3/#maximum-allowed-code-point
const MAX_CODEPOINT = 0x10ffff;
const REPLACEMENT_CHARACTER = 0xfffd;

const OPEN_PAREN = 0x28;
const CLOSE_PAREN = 0x29;

export function* findUrls(
	contents: string,
): Iterable<{start: number; end: number; value: string}> {
	let pos = contents.length;

	let width = 1;
	let current: number = -1;

	function pop() {
		return jump(pos + width);
	}

	function jump(loc: number) {
		pos = loc;
		current = contents.codePointAt(pos) ?? EOF;
		width = current > 0xffff ? 2 : 1;

		return current;
	}

	function consumeEscape(url: {value: string}): boolean {
		// re-assignment to current is only needed because typescript doesn't
		// think pop() can update current, isn't that useful? :)
		pop();

		if (current === EOF) {
			return false;
		}

		if (isNewline(current)) {
			// do not append anything to the value
			pop();
		} else if (!isHex(current)) {
			url.value += String.fromCodePoint(current);
			pop();
		} else {
			const startOfHex = pos;
			while (pos - startOfHex < 5 && isHex(current)) {
				pop();
			}

			let codePoint = parseInt(contents.slice(startOfHex, pos), 16);

			if (isWhitespace(current)) {
				pop();
			}

			if (
				isNaN(codePoint) ||
				codePoint === 0 ||
				codePoint > MAX_CODEPOINT ||
				isSurrogate(codePoint)
			) {
				codePoint = REPLACEMENT_CHARACTER;
			}

			url.value += String.fromCodePoint(codePoint);
		}

		return true;
	}

	// Based on https://www.w3.org/TR/css-syntax-3/#consume-ident-like-token
	while ((pos = contents.lastIndexOf("url(", pos)) !== EOF) {
		const start = pos;
		width = 1;

		// Ensure whitespace, comma, or colon before `url(`
		if (pos > 0) {
			const previous = contents.codePointAt(pos - 1) ?? EOF;
			if (
				previous !== 0x2c && //
				previous !== 0x3a && //
				!isWhitespace(previous)
			) {
				pos = start - 1;
				continue;
			}
		}

		// Set position to after the (
		jump(pos + 4);

		while (isWhitespace(current)) {
			pop();
		}

		// Initialize URL state
		const url = {start: pos, end: -1, value: ""};

		// url(foo) -> consume-url-token, url('foo') -> consume-string-token
		if (isQuote(current)) {
			const ending = current;
			pop();

			// https://www.w3.org/TR/css-syntax-3/#consume-string-token
			while (current !== EOF) {
				if (current === ending) {
					url.end = pos + 1;
					break;
				}

				if (isNewline(current)) {
					// invalid
					break;
				}

				if (current === ESCAPE) {
					if (!consumeEscape(url)) {
						break;
					}
				} else {
					url.value += String.fromCodePoint(current);
					pop();
				}
			}
		} else {
			// https://www.w3.org/TR/css-syntax-3/#consume-url-token
			while (current !== EOF) {
				if (isQuote(current) || current === OPEN_PAREN) {
					// invalid
					break;
				}

				if (current === CLOSE_PAREN) {
					url.end = pos;
					break;
				}

				if (isWhitespace(current)) {
					while (isWhitespace(current)) {
						pop();
					}

					// Whitespace is only allowed at the end (we already took care of any
					// whitespace at the start)

					if (current === CLOSE_PAREN) {
						url.end = pos;
					}

					break;
				}

				if (current === ESCAPE) {
					if (!consumeEscape(url)) {
						break;
					}
				} else {
					url.value += String.fromCodePoint(current);
					pop();
				}
			}
		}

		// An end position indicates a URL was found
		if (url.end !== -1) {
			yield url;
		}

		pos = start - 1;
	}
}
