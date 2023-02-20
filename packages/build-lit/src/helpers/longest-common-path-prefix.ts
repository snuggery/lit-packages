export function findCommonPathPrefix(paths: readonly string[]): string {
	if (paths.length === 0) {
		return '';
	}

	let longestCommonPath = paths[0]!;

	for (const path of paths.slice(1)) {
		const length = Math.min(path.length, longestCommonPath.length);

		for (let i = 0; i < length; i++) {
			if (path[i] !== longestCommonPath[i]) {
				longestCommonPath = longestCommonPath.slice(0, i);
				break;
			}
		}
	}

	const lastSlash = longestCommonPath.lastIndexOf('/');
	return lastSlash === -1
		? longestCommonPath
		: longestCommonPath.slice(0, lastSlash);
}
