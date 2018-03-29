// @flow

import type {ISensor} from "./ISensor";

// Interface for Sensor data
export interface ISensorData extends ISensor {
  serialNumber: string;
  value: number;
  timestamp?: ?Object;
}