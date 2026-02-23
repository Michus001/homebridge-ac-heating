
const ACHeatingAccessory = require("./accessory");

class ACHeatingPlatform {

  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.accessories = [];

    if (!config) return;

    api.on("didFinishLaunching", () => {
      this.setupAccessories();
    });
  }

  configureAccessory(accessory) {
    this.accessories.push(accessory);
  }

  setupAccessories() {
    const devices = [
      { name: "Heating", type: "heating" },
      { name: "Hot Water", type: "dhw" },
      { name: "Away Mode", type: "away" }
    ];

    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate("ac-heating-" + device.type);
      let accessory = this.accessories.find(a => a.UUID === uuid);

      if (!accessory) {
        accessory = new this.api.platformAccessory(device.name, uuid);
        new ACHeatingAccessory(this, accessory, device.type);
        this.api.registerPlatformAccessories(
          "homebridge-ac-heating",
          "ACHeatingPlatform",
          [accessory]
        );
      } else {
        new ACHeatingAccessory(this, accessory, device.type);
      }
    }
  }
}

module.exports = ACHeatingPlatform;
