// @flow

import type {ISensorObserver} from "../../interfaces/observers/ISensorObserver";
import type {ISensorData} from "../../interfaces/sensors/ISensorData";

const
  shell = require('shelljs'),
  sensorTypes = require('../../sensorTypes');

require('dotenv').config();

const DEVICE_SERIAL_NUMBER = '1';

// Values below this is invalid
const MIN_CO2_LEVEL = 200;

// Driver for CO2 sensor ZG01C
// Needs https://github.com/dmage/co2mon library to read data from device via USB
class Co2SensorDriver implements ISensorObserver {

  // Last red data
  currentData: ISensorData;

  // List of listeners
  subscribers: Array<Function>;

  // Initialization method
  init() {
    if (!process.env.CO2_MONITOR_PATH) throw new Error('CO2_MONITOR_PATH is missing');

    // Killing previous started co2mond processes
    shell.exec('sudo killall co2mond', {silent: true});

    const self = this;

    // Starting new co2mond processes
    const child = shell.exec(`sudo ${process.env.CO2_MONITOR_PATH || ''}`, {async: true, silent: true});

    // Initializing subscribers list
    self.subscribers = [];

    // On device data
    child.stdout.on('data', (data) => {
      // Temp data is ignored
      if (!data.includes('CntR')) return;

      // Parsing CO2 level
      const co2level = parseInt(data.substring(5, data.length - 1));

      // If CO2 level is invalid, dropping it
      if (isNaN(co2level) || co2level < MIN_CO2_LEVEL) return;

      // Updating current value
      self.currentData = {
        serialNumber: DEVICE_SERIAL_NUMBER,
        type: sensorTypes.CO2,
        value: co2level
      };

      // Notifying subscribers
      self.notifySubscribers(self.currentData);
    });
  }

  // Returns all available sensors serial numbers
  getSerialNumbers() {
    return ['1'];
  }

  // Returns sensor data by serial number
  getDataBySerialNumber() {
    return this.currentData;
  }

  // Returns all sensors data
  getDataForAll() {
    return [this.getDataBySerialNumber()];
  }

  // Adds new subscriber
  onData(func: Function) {
    this.subscribers.push(func);
  }

  // Notifies subscribers
  notifySubscribers(data: ISensorData) {
    this.subscribers.forEach(s => s(data));
  }
}


module.exports = Co2SensorDriver;