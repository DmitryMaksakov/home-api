// @flow

import type {ISensorData} from "../../interfaces/sensors/ISensorData";
import type {IObserver} from "../../interfaces/observers/IObserver";
import type {INotifier} from "../../interfaces/INotifier";

const
  moment = require('moment'),
  db = require('../db/db'),
  caseMapper = require('../../helpers/caseMapper');

const
  SECURITY_ENABLE_COMMANDS = ['охрана'],
  SECURITY_DISABLE_COMMANDS = ['снять'],
  SECURITY_ENABLED_TEXT = 'Охрана включена',
  SECURITY_DISABLED_TEXT = 'Охрана снята';

// This module handles security commands and events
class SecurityChecker {

  // Sensors values data provider
  sensorsObserver: IObserver;

  // Commands data provider
  commandsObserver: IObserver;

  // List of notifiers
  notifiers: INotifier[];

  // Security enabled flag
  securityEnabled: boolean;

  // Last moment when some security event has happend
  lastSecuritySensorsActivityMoment: number;

  // Initialization method
  async init(sensorsObserver: IObserver, notifiers: INotifier[], commandsObserver: IObserver) {
    this.securityEnabled = true;
    this.sensorsObserver = sensorsObserver;
    this.commandsObserver = commandsObserver;
    this.notifiers = notifiers || [];
    this.lastSecuritySensorsActivityMoment = moment();

    const
      self = this,

      // Loading all security sensors information from db
      securitySensors =
        (await db.query(
          `select sensors.name, serial_number, device_types.name as type, security from sensors 
          left join device_types on sensors.type = device_types.id 
          where security = true`
        )).map(caseMapper),

      // Security sensors dictionary by Id
      securitySensorsBySerialNumberId = {};

    // Filling up the dictionary
    securitySensors.forEach(sensor => securitySensorsBySerialNumberId[sensor.serialNumber] = sensor);

    // Sending security on confirmation
    if (self.securityEnabled) {
      self.notifiers.forEach(n => n.sendBroadcast(SECURITY_ENABLED_TEXT));
    }

    // Subscribing on commands
    self.commandsObserver.onData(msg => {
      if (SECURITY_ENABLE_COMMANDS.includes(msg.text.toLowerCase())) {
        self.securityEnabled = true;
        self.notifiers.forEach(n => n.sendBroadcast(SECURITY_ENABLED_TEXT));
      } else if (SECURITY_DISABLE_COMMANDS.includes('снять')) {
        self.securityEnabled = false;
        self.notifiers.forEach(n => n.sendBroadcast(SECURITY_DISABLED_TEXT));
        self.lastSecuritySensorsActivityMoment = moment();
      }
    });

    // Subscribing on sensors data updates
    self.sensorsObserver.onData((sensorData: ISensorData) => {
      const sensor = securitySensorsBySerialNumberId[sensorData.serialNumber];
      if (sensor) {
        self.lastSecuritySensorsActivityMoment = moment();

        if (self.securityEnabled) {
          self.notifiers.forEach(n => n.sendBroadcast(`Сработал датчик охраны: ${sensor.name}, ${sensor.type}`));
        }
      }
    });

    // Security auto on
    // setInterval(() => {
    //   if (!self.securityEnabled && moment().subtract(1, 'hour').isAfter(self.lastSecuritySensorsActivityMoment)) {
    //     self.securityEnabled = true;
    //     self.notifiers.forEach(n => n.sendBroadcast(`Охрана включена автоматически из-за отсутствия движения`));
    //     self.lastSecuritySensorsActivityMoment = moment();
    //   }
    // }, 60000);
  }
}

module.exports = SecurityChecker;