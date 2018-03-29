// @flow

import type {ISensorObserver} from "../../../interfaces/observers/ISensorObserver";
import type {ISensorTrendsData} from "../../../interfaces/sensors/ISensorTrendsData";
import type {ISensorData} from "../../../interfaces/sensors/ISensorData";
import type {IDerivativeSensorObserver} from "../../../interfaces/observers/IDerivativeSensorObserver";
import type {IConnectedSensor} from "../../../interfaces/sensors/IConnectedSensor";

// Check if some sensor went offline interval
const CHECK_INTERVAL = 5000;

// Data update interval
const UPDATE_INTERVAL = 60000;

const
  moment = require('moment'),
  {DEFAULT_OBSERVER_CLEAR_INTERVAL} = require('../../../config/defaults'),
  {SERVER_TIMESTAMP_FORMAT} = require('../../../config/defaults'),
  db = require('../../db/db');

// Calculates sensors trends
class SensorsTrendsObserver implements IDerivativeSensorObserver {

  // Interval ID for clear observer check
  observerClearIntervalId: number;

  // Interval ID for sensors trends calculation
  sensorsTrendsIntervalId: number;

  // Sensor observer instance
  sensorObserver: ISensorObserver;

  // Sensors dictionary by serial number key
  sensorsBySerialNumber: {[string]: IConnectedSensor};

  // Sensors data dictionary by serial number key
  sensorsDataBySerialNumber: {[string]: ISensorTrendsData};

  // Sensors observer subscribers
  subscribers: Array<Function>;

  constructor() {
    this.sensorsDataBySerialNumber = {};

    // Checking if some sensor went offline
    this.observerClearIntervalId = setInterval(() => {
      const clearInterval = parseInt(process.env.OBSERVER_CLEAR_INTERVAL) || DEFAULT_OBSERVER_CLEAR_INTERVAL;

      for (const serialNumber in this.sensorsDataBySerialNumber) {
        const {timestamp} = this.sensorsDataBySerialNumber[serialNumber];

        if (moment(timestamp).add(clearInterval, 'milliseconds').isBefore(moment().utc())) {
          delete this.sensorsDataBySerialNumber[serialNumber];
        }
      }
    }, CHECK_INTERVAL);
  }

  // Initialization method
  init(sensorsObserver: ISensorObserver, registeredSensors?: Array<IConnectedSensor>): void {
    this.sensorObserver = sensorsObserver;
    this.sensorsBySerialNumber = {};
    this.subscribers = [];

    // Fulfill sensors dictionary
    if (registeredSensors) {
      registeredSensors.forEach((sensor: IConnectedSensor) => {
        this.sensorsBySerialNumber[sensor.serialNumber] = sensor;
      });
    } else {
      console.warn('No registeredSensors are passed to SensorsTrendsObserver!');
    }

    // Calculating sensor trends for the first time
    this.sensorObserver
      .getDataForAll()
      .forEach(data => this.handleSensorData(data));

    // Start sensors trends calculation
    this.sensorsTrendsIntervalId = setInterval(() => {
      this.sensorObserver
        .getDataForAll()
        .forEach(data => this.handleSensorData(data));
    }, UPDATE_INTERVAL);
  }

  // Dispose method
  dispose() {
    clearInterval(this.observerClearIntervalId);
    clearInterval(this.sensorsTrendsIntervalId);
  }

  // Sensor trends calculation
  async handleSensorData(sensorData: ISensorData): Promise<void> {
    const
      sensorId = this.sensorsBySerialNumber[sensorData.serialNumber].id,

      // Long 1h trend
      sensorLongTrendLog =
        ((await db.query(
          `select value from sensors_log 
            where sensor_id='${sensorId}' and 
            timestamp > '${moment().utc().subtract(1, 'hours').format(SERVER_TIMESTAMP_FORMAT)}'
            limit 3`))
          .map(sensorLog => sensorLog.value)
          .reduce((a, b) => a + b, 0)) / 3,

      // Short 5m trend
      sensorShortTrendLog =
        ((await db.query(
          `select value from sensors_log 
            where sensor_id='${sensorId}' and 
            timestamp > '${moment().utc().subtract(5, 'minutes').format(SERVER_TIMESTAMP_FORMAT)}'
            limit 2`))
          .map(sensorLog => sensorLog.value)
          .reduce((a, b) => a + b, 0)) / 2;

    // Notify subscribers
    this.onSensorData({
      longTrendChange: (sensorData.value - sensorLongTrendLog),
      shortTrendChange: (sensorData.value - sensorShortTrendLog) * 12,
      value: sensorData.value,
      timestamp: sensorData.timestamp,
      serialNumber: sensorData.serialNumber,
      type: sensorData.type,
      id: sensorId
    });
  }

  // On data updates from sensors
  onSensorData(sensorData: ISensorTrendsData): void {
    this.notifySubscribers(sensorData, this.sensorsDataBySerialNumber[sensorData.serialNumber]);
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
  notifySubscribers(data: ISensorTrendsData, oldData: ISensorTrendsData): void {
    this.subscribers.forEach(s => s(data, oldData));
  }
}

module.exports = SensorsTrendsObserver;