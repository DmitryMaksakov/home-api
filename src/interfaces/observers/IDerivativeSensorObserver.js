// @flow

import type {ISensorObserver} from "./ISensorObserver";
import type {ISensorObserverBase} from "./ISensorObserverBase";

// Interface for observers that are using another observers
export interface IDerivativeSensorObserver extends ISensorObserverBase {
  init(sensorsObserver: ISensorObserver): void | Promise<void>;
}