// @flow

import type {ISensorObserverBase} from "./ISensorObserverBase";

// interface for Sensor observer
export interface ISensorObserver extends ISensorObserverBase {
  init(): void | Promise<void>;
}