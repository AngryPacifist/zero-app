const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .mjs extension for Metaplex ESM packages
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Enable package exports for ESM resolution
config.resolver.unstable_enablePackageExports = true;

// Ensure .mjs files are treated as JavaScript
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'mjs');

module.exports = config;
