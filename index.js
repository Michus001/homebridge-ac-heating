
module.exports = (homebridge) => {
  homebridge.registerPlatform(
    "homebridge-ac-heating",
    "ACHeatingPlatform",
    require("./platform")
  );
};
