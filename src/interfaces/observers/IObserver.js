// @flow

// Interface for simple observer
export interface IObserver {
  onData(func: Function): void;
  subscribers: Array<Function>;
}