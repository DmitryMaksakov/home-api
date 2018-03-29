// @flow

import type {ISensorObserver} from "../../../interfaces/observers/ISensorObserver";
import type {ISensorData} from "../../../interfaces/sensors/ISensorData";
import type {IDataModifiable} from "../../../interfaces/IDataModifiable";

const
  moment = require('moment'),
  DEFAULT_OBSERVER_CLEAR_INTERVAL = require('../../../config/defaults'),
  Co2SensorDriver = require('../../drivers/Co2Driver'),
  SerialBridgeDriver = require('../../drivers/SerialBridgeDriver');

// Check if some sensor went offline interval
const CHECK_INTERVAL = 5000;

// Collects all sensors values
class SensorsObserver implements ISensorObserver, IDataModifiable {

  // Interval ID for clear observer check
  intervalId: number;

  // Wireless bridge driver
  bridgeSensors: ISensorObserver;

  // CO2 driver
  co2Sensors: ISensorObserver;

  // Sensors data dictionary by serial number key
  sensorsDataBySerialNumber: {[string]: ISensorData};

  // Sensors observer subscribers
  subscribers: Array<Function>;

  // Sensors data modifiers
  dataModifiers: ?Array<Function>;

  constructor() {
    this.bridgeSensors = new SerialBridgeDriver();
    this.co2Sensors = new Co2SensorDriver();

    this.sensorsDataBySerialNumber = {};

    // Checking if some sensor went offline
    this.intervalId = setInterval(() => {
      const observerClearInterval = parseInt(process.env.OBSERVER_CLEAR_INTERVAL) || DEFAULT_OBSERVER_CLEAR_INTERVAL;

      for (const serialNumber in this.sensorsDataBySerialNumber) {
        const {timestamp} = this.sensorsDataBySerialNumber[serialNumber];

        if (moment(timestamp).add(observerClearInterval, 'milliseconds').isBefore(moment().utc())) {
          delete this.sensorsDataBySerialNumber[serialNumber];
        }
      }
    }, CHECK_INTERVAL);
  }

  // Initialization method
  async init(modifiers?: Array<Function>): Promise<void> {
    this.dataModifiers = modifiers;
    this.sensorsDataBySerialNumber = {};
    this.subscribers = [];

    await this.co2Sensors.init();
    await this.bridgeSensors.init();

    this.co2Sensors.onData(data => this.onSensorData(data));
    this.bridgeSensors.onData(data => this.onSensorData(data));
  }

  // Dispose method
  dispose() {
    clearInterval(this.intervalId);
  }

  // On data updates from sensors
  onSensorData(sensorData: ISensorData): void {
    // TODO: mutation because of flow that can't understand spread operator, replace this with spread later
    sensorData.timestamp = moment().utc();

    // Modifying data
    if (this.dataModifiers) {
      this.dataModifiers.forEach(m => sensorData = m(sensorData));
    }

    // Notifying subscribers
    this.notifySubscribers(sensorData, this.sensorsDataBySerialNumber[sensorData.serialNumber]);

    // Updating current values
    this.sensorsDataBySerialNumber[sensorData.serialNumber] = sensorData;
  }

  // Returns all available sensors serial numbers
  getSerialNumbers(): Array<string> {
    return Object.keys(this.sensorsDataBySerialNumber);
  }

  // Returns sensor data by serial number
  getDataBySerialNumber(serialNumber: string): ISensorData {
    return this.sensorsDataBySerialNumber[serialNumber];
  }

  // Returns all sensors data
  getDataForAll(): Array<ISensorData> {
    return this.getSerialNumbers().map(sn => this.getDataBySerialNumber(sn));
  }

  // Adds new subscriber
  onData(func: Function): void {
    this.subscribers.push(func);
  }

  // Notifies subscribers
  notifySubscribers(data: ISensorData, oldData: ISensorData): void {
    this.subscribers.forEach(s => s(data, oldData));
  }
}

module.exports = SensorsObserver;