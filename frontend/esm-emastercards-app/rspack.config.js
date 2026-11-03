const config = require('openmrs/default-rspack-config');

// esm-patient-common-lib is published as TypeScript source, so compile it along with this app
config.scriptRuleConfig.exclude = /node_modules\/(?!@openmrs\/esm-patient-common-lib\/)/;

module.exports = config;
