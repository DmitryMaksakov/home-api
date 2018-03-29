// @flow

import type {IObserver} from "./IObserver";

// Interface for Logger that logs some observer data
export interface IObserverLogger {
  init(observer: IObserver): void | Promise<void>;
  observer: IObserver;
}