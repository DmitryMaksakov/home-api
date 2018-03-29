// @flow

import type {ISensorData} from "../sensors/ISensorData";
import type {IObserver} from "./IObserver";

// Generic interface for Sensor observer
export interface ISensorObserverBase extends IObserver {
  getSerialNumbers(): Array<string>;
  getDataBySerialNumber(serialNumber: string): ISensorData;
  getDataForAll(): Array<ISensorData>;
}