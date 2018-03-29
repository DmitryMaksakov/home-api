// @flow

import type {ISensor} from "./ISensor";

// Interface for Connected Sensor (registered in database)
export interface IConnectedSensor extends ISensor {
  id: number;
}