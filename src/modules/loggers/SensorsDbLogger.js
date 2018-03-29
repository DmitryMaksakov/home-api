// @flow

import type {IObserverLogger} from "../../interfaces/observers/IObserverLogger";
import type {IObserver} from "../../interfaces/observers/IObserver";

const
  moment = require('moment'),
  {SERVER_TIMESTAMP_FORMAT} = require('../../config/defaults'),
  db = require('../db/db');

// Logs Connected sensors data to database
class SensorsDbLogger implements IObserverLogger {

  // Passed observer
  observer: IObserver;

  async init(observer: IObserver) {
    this.observer = observer;

    // Subscribe on data event from observer
    this.observer.onData(async sensor => {
      // Sensor is not registered in system
      if (!sensor.id)
        return;

      const timestamp = moment().utc().format(SERVER_TIMESTAMP_FORMAT);

      await db.query(`insert into sensors_log (sensor_id, value, timestamp) values (${sensor.id}, ${sensor.value}, '${timestamp}')`);
    });
  }
}

module.exports = SensorsDbLogger;