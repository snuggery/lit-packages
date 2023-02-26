/**
 * @param {import('karma').Config} config
 */
module.exports = config => {
	config.set({
		plugins: ['karma-jasmine', 'karma-chrome-launcher'],
		frameworks: ['jasmine'],
		browsers: ['ChromeHeadless'],
	});
};
