// @flow

import type {ISensorData} from "./ISensorData";

// Interface for Sensors trends data (long and short time values change)
export interface ISensorTrendsData extends ISensorData {
  longTrendChange: number;
  shortTrendChange: number;
}