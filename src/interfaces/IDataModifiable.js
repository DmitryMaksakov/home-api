// @flow

// Interface for Classes that can use some data modifiers
export interface IDataModifiable {
  init(modifiers?: Array<Function>): void | Promise<void>;
  dataModifiers: ?Array<Function>;
}