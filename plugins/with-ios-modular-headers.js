const { withPodfile } = require("@expo/config-plugins");

const MODULAR_HEADERS_LINE = "use_modular_headers!";

function addModularHeaders(contents) {
  if (contents.includes(MODULAR_HEADERS_LINE)) {
    return contents;
  }

  return contents.replace(
    /(platform :ios, podfile_properties\['ios\.deploymentTarget'\] \|\| '[^']+'\n)/,
    `$1${MODULAR_HEADERS_LINE}\n`
  );
}

module.exports = function withIosModularHeaders(config) {
  return withPodfile(config, (config) => {
    config.modResults.contents = addModularHeaders(config.modResults.contents);
    return config;
  });
};
