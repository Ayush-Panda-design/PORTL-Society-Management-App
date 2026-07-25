const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Windows EMFILE fix: Metro's Temp\metro-cache FileStore opens too many files
// during parallel transforms. Disable persistent cache + keep workers low.
config.maxWorkers = 2;
config.cacheStores = [];

module.exports = withNativeWind(config, { input: './src/global.css' });
