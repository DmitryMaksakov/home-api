// @flow

import type {IObserver} from "../../interfaces/observers/IObserver";
import type {INotifier} from "../../interfaces/INotifier";

const
  moment = require('moment'),
  {SERVER_TIMESTAMP_FORMAT} = require('../../config/defaults'),
  db = require('../db/db'),
  caseMapper = require('../../helpers/caseMapper');

// Threshold overflow interface
interface IThresholdOverflow {
  value: number;
  overflowType: string;
  timestamp: string;
}

// Threshold setup interface
interface IThresholdSetup {
  id: number;
  sensorId: string;
  name: string;
  alertLevel: string;
  minValue: number;
  maxValue: number;
  delta: number;
}

// This moddule checks if some sensors values goes above or down than threshold
class SensorThresholdsChecker {

  // Sensors values data provider
  sensorsObserver: IObserver;

  // List of notifiers
  notifiers: INotifier[];

  // Overflows history dictionary by threshold ID
  thresholdOverflowByThresholdId: {[string]: IThresholdOverflow};

  // Overflows setups dictionary by sensor ID
  thresholdSetupsBySensorId: {[string]: IThresholdSetup};

  // Sets threshold overflow record
  setThresholdOverflow(thresholdId: string, value: number, overflowType: string) {
    this.thresholdOverflowByThresholdId[thresholdId] = {
      value,
      overflowType,
      timestamp: moment().utc().format(SERVER_TIMESTAMP_FORMAT)
    };
  }

  // Deletes threshold overflow record
  deleteThresholdOverflow(thresholdId: string, overflowType: string) {
    if (this.thresholdOverflowByThresholdId[thresholdId] &&
      this.thresholdOverflowByThresholdId[thresholdId].overflowType === overflowType)
    {
      delete this.thresholdOverflowByThresholdId[thresholdId];
    }
  }

  // Initialization method
  async init(sensorsObserver: IObserver, notifiers: INotifier[]) {
    const
      self = this,

      // Loading thresholds from database
      thresholds =
        await db.query(
          `select sensors_thresholds.id as id, 
           sensors_thresholds.name as name, 
           min_value, max_value, sensor_id, delta, unit 
           from sensors_thresholds 
           left join sensors on sensors_thresholds.sensor_id = sensors.id 
           left join device_types on sensors.type = device_types.id`);

    this.thresholdSetupsBySensorId = {};
    this.thresholdOverflowByThresholdId = {};
    this.sensorsObserver = sensorsObserver;
    this.notifiers = notifiers || [];

    // Filling dictionaries and doing delta setup if needed
    thresholds
      .map(caseMapper)
      .forEach(t => {
        if (!this.thresholdSetupsBySensorId[t.sensorId]) {
          this.thresholdSetupsBySensorId[t.sensorId] = [];
        }

        if (!t.delta) {
          t.delta = 0;
        }

        this.thresholdSetupsBySensorId[t.sensorId].push(t);
      });

    // Subscribing on sensors data updates
    this.sensorsObserver.onData(sensorData => {
      const sensorThresholds = self.thresholdSetupsBySensorId[sensorData.id];

      // If updated data sensor has some thresholds
      if (sensorThresholds) {
        sensorThresholds.forEach(threshold => {

          // If current threshold record doesn't exist
          if (!this.thresholdOverflowByThresholdId[threshold.id]) {

            // If threshold has min value and sensor value is below min value
            if (!isNaN(threshold.minValue) && sensorData.value < threshold.minValue) {
              this.setThresholdOverflow(threshold.id, sensorData.value, 'low');

              // Notify listeners
              this.notifiers.forEach(async n => {
                await n.sendBroadcast(
                  `Значение ${sensorData.value}${threshold.unit} меньше порогового ${threshold.name} (${threshold.minValue}${threshold.unit})`)
              });
            }

            // If threshold has max value and sensor value is above max value
            if (!isNaN(threshold.maxValue) && sensorData.value >= threshold.maxValue) {
              this.setThresholdOverflow(threshold.id, sensorData.value, 'high');

              // Notify listeners
              this.notifiers.forEach(async n => {
                await n.sendBroadcast(
                  `Значение ${sensorData.value}${threshold.unit} больше порогового ${threshold.name} (${threshold.maxValue}${threshold.unit})`)
              });
            }
            // If current threshold record exists
          } else {

            // If threshold has min value and sensor value is normal now (above min value + safety delta)
            if (!isNaN(threshold.minValue) && sensorData.value >= threshold.minValue + threshold.delta) {
              this.deleteThresholdOverflow(threshold.id, 'low');
            }

            // If threshold has max value and sensor value is normal now (below max value - safety delta)
            if (!isNaN(threshold.maxValue) && sensorData.value < threshold.maxValue - threshold.delta) {
              this.deleteThresholdOverflow(threshold.id, 'high');
            }
          }
        });
      }
    });
  }
}

module.exports = SensorThresholdsChecker;