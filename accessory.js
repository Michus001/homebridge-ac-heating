
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

class ACHeatingAccessory {

  constructor(platform, accessory, type) {
    this.platform = platform;
    this.accessory = accessory;
    this.type = type;

    const { Service, Characteristic } = platform.api.hap;
    this.Service = Service;
    this.Characteristic = Characteristic;

    this.parser = new XMLParser({ ignoreAttributes: false });

    this.ip = platform.config.ip;
    this.username = platform.config.username;
    this.password = platform.config.password;
    this.heatingRegister = platform.config.heatingRegister;
    this.dhwRegister = platform.config.dhwRegister;
    this.awayRegister = platform.config.awayRegister;
    this.heatingIndex = platform.config.heatingIndex || 1;
    this.dhwIndex = platform.config.dhwIndex || 40;
    this.pollInterval = platform.config.pollInterval || 10000;

    if (type === "heating" || type === "dhw") {
      this.service = accessory.getService(this.Service.Thermostat)
        || accessory.addService(this.Service.Thermostat);

      this.service
        .getCharacteristic(this.Characteristic.TargetTemperature)
        .setProps({ minValue: 5, maxValue: 70, minStep: 0.1 })
        .on("set", async (value, cb) => {
          const register = this.type === "heating"
            ? this.heatingRegister
            : this.dhwRegister;

          await this.postRegister(register, value.toFixed(1));
          cb();
        });
    }

    if (type === "away") {
      this.service = accessory.getService(this.Service.Switch)
        || accessory.addService(this.Service.Switch);

      this.service
        .getCharacteristic(this.Characteristic.On)
        .on("set", async (value, cb) => {
          await this.postRegister(this.awayRegister, value ? 2 : 1);
          cb();
        });
    }

    setInterval(() => this.poll(), this.pollInterval);
  }

  async fetchXML() {
    const res = await axios.get(`http://${this.ip}/MAIN1.XML`, {
      auth: { username: this.username, password: this.password },
      timeout: 5000
    });
    return this.parser.parse(res.data);
  }

  async poll() {
    try {
      const data = await this.fetchXML();
      const inputs = data?.PAGE?.INPUTA || [];
      const requests = data?.PAGE?.INPUTR || [];

      if (this.type === "heating" || this.type === "dhw") {
        const index = this.type === "heating"
          ? this.heatingIndex
          : this.dhwIndex;

        const current = this.findByN(inputs, index);
        const target = this.findByN(requests, index);

        if (current && target) {
          this.service.updateCharacteristic(
            this.Characteristic.CurrentTemperature,
            parseFloat(current["@_VALUE"])
          );
          this.service.updateCharacteristic(
            this.Characteristic.TargetTemperature,
            parseFloat(target["@_VALUE"])
          );
        }
      }

    } catch (err) {
      this.platform.log("Poll error:", err.message);
    }
  }

  findByN(arr, n) {
    if (!Array.isArray(arr)) arr = [arr];
    return arr.find(i => i["@_N"] == n);
  }

  async postRegister(register, value) {
    await axios.post(
      `http://${this.ip}/`,
      `${register}=${value}`,
      {
        auth: { username: this.username, password: this.password },
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );
  }
}

module.exports = ACHeatingAccessory;
