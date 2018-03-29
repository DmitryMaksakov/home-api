// @flow

import type {ISensorObserver} from "../../interfaces/observers/ISensorObserver";
import type {ISensorData} from "../../interfaces/sensors/ISensorData";

const sensorTypes = require('../../sensorTypes');

// Sensor types convertation rules
const SENSOR_TYPES_DICTIONARY = {
  '1': sensorTypes.TEMP,
  '2': sensorTypes.HUMIDITY,
  '5': sensorTypes.MOTION
};

// Driver for Serial Bridge (https://github.com/DmitryMaksakov/home-wireless-bridge)
// All radio-sensors passes their data through this driver
class SerialBridgeDriver implements ISensorObserver {

  // Sensors dictionary by sensor ID
  sensorsDictionaryBySerialNumber: {[string]: ISensorData};

  // List of listeners
  subscribers: Array<Function>;

  // Initialization method
  init() {
    const
      self = this,
      SerialPort = require('serialport'),

      // Serial port instance
      port = new SerialPort(process.env.SERIAL_PATH, {
        baudRate: 9600
      });

    // Buffer for serial port data
    let dataBuffer = [];

    self.sensorsDictionaryBySerialNumber = {};
    self.subscribers = [];

    // Listen to error events on Serial port
    port.on('error', (err) => {
      console.log('Error: ', err.message);
    });

    // Listen to data events on Serial port
    port.on('data', (data) => {

      // Iterating through data byte array
      for (let i = 0; i < data.length; i++) {
        // Fulfilling data buffer
        dataBuffer.push(data[i]);

        // If data buffer has correct packet (starts with [0x0 0x0 0x0] and ends with [0xff 0xff 0xff])
        if (dataBuffer.filter(e => e === 0x0).length === 3 && dataBuffer.filter(e => e === 0xff).length === 3)
        {
          // Parsing packet
          let sensorData = self.parseBuffer([...dataBuffer]);

          // Storing sensor data
          self.sensorsDictionaryBySerialNumber[sensorData.serialNumber] = sensorData;

          // Notifying subscribers
          self.notifySubscribers(sensorData);

          // Clearing data buffer
          dataBuffer = [];
        }
      }
    });
  }

  // Parses packet from Serial port buffer
  parseBuffer(buffer: Array<number>): ISensorData {
    const
      // Sensor serial number
      serialNumber = parseInt(((buffer[3] << 0) & 0xFF) + ((buffer[4] << 8) & 0xFF00)),

      // Packet command
      command = parseInt(buffer[5]),

      // Current sensor value (array of digits)
      dataBytes = buffer.slice(6, buffer.length - 3);

    let
      dataStr = '',
      data = -999;

    // Parsing value
    if (dataBytes) {
      dataBytes.forEach(b => {
        dataStr += String.fromCharCode(b)
      });

      if (dataStr !== 'nan') {
        data = parseFloat(dataStr);
      }
    }

    // Returning result
    return {
      serialNumber: serialNumber.toString() + command.toString(),
      type: SENSOR_TYPES_DICTIONARY[command.toString()],
      value: data
    }
  }

  // Returns all available sensors serial numbers
  getSerialNumbers() {
    return Object.keys(this.sensorsDictionaryBySerialNumber);
  }

  // Returns sensor data by serial number
  getDataBySerialNumber(id: string): ISensorData {
    let data = this.sensorsDictionaryBySerialNumber[id];

    return {
      serialNumber: data.serialNumber,
      type: data.type,
      value: data.value
    };
  }

  // Returns all sensors data
  getDataForAll(): Array<ISensorData> {
    return this.getSerialNumbers().map(id => this.getDataBySerialNumber(id));
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

module.exports = SerialBridgeDriver;