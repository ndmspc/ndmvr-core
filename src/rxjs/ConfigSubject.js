import { BehaviorSubject } from "rxjs";
import { parseConfig, appendPads, resolveHistogramGridConfig } from "../utils/baseUtil.js";
import {Vector3, Color} from "three";
import cloneDeep from "lodash.clonedeep";
import defaultConfig from "../config-default.json";

let configSubject;

class ConfigSubject {
  #subject;
  #histogramGridConfig;

  constructor () {
    this.#histogramGridConfig = resolveHistogramGridConfig(defaultConfig.config.environment.histogramPads);
    this.#subject = new BehaviorSubject(parseConfig(defaultConfig, {}));
  }

  getObservable () {
    return this.#subject.asObservable();
  }

  getValue () {
    return this.#subject.getValue();
  }

  // Metadata for the currently applied grid, not an editable configuration mirror.
  getHistogramGridConfig () {
    return cloneDeep(this.#histogramGridConfig);
  }

  next (e) {
    const input = typeof e === "string" ? JSON.parse(e) : e;
    const parsed = parseConfig(input, this.#subject.getValue());
    const environment = input?.config?.environment;
    let grid = this.#histogramGridConfig;
    if (environment && Object.hasOwn(environment, "histogramPads")) {
      grid = resolveHistogramGridConfig(environment.histogramPads);
    } else if (!Array.isArray(parsed?.config?.environment?.histogramPads)) {
      grid = null;
    }
    // Commit metadata only after parsing succeeds, before notifying subscribers.
    this.#histogramGridConfig = grid;
    this.#subject.next(parsed);
    return parsed;
  }

  appendPads(ids, disp_kind, settings) {
    const updated = appendPads(this.#subject.getValue(), ids, disp_kind, settings);
    if (ids.length > 0) this.#histogramGridConfig = null;
    this.#subject.next(updated);
  }

  updateHistogramPad(id, bounds) {
    const supplied = ["position", "scale"].filter(key => bounds[key] !== undefined);
    for (const key of supplied) {
      const vector = bounds[key];
      if (!vector || !["x", "y", "z"].every(axis => Number.isFinite(vector[axis]))) {
        throw new TypeError(key + " requires complete finite XYZ values");
      }
    }
    const pads = this.#subject.getValue()?.config?.environment?.histogramPads;
    const index = Array.isArray(pads) ? pads.findIndex(pad => pad.id === id) : -1;
    if (index < 0 || supplied.length === 0) return false;
    const pad = pads[index];
    if (supplied.every(key => ["x", "y", "z"].every(axis => pad[key]?.[axis] === bounds[key][axis]))) {
      return false;
    }
    const updated = { ...pad };
    for (const key of supplied) {
      const { x, y, z } = bounds[key];
      updated[key] = new Vector3(x, y, z);
    }
    const replacement = pads.slice();
    replacement[index] = updated;
    this.next({ config: { environment: { histogramPads: replacement } } });
    return true;
  }

  mergeHistogramConfig (partialConfig, currentConfig = this.#subject.value.config.histogram) {
    // If partialConfig is undefined/null, return defaultConfig
    if (partialConfig === undefined || partialConfig === null) {
      return currentConfig;
    }

    // If defaultConfig is not an object, return partialConfig
    if (typeof currentConfig !== "object" || currentConfig === null) {
      return partialConfig;
    }

    // If partialConfig is not an object, return it as-is
    if (typeof partialConfig !== "object" || partialConfig === null) {
      return partialConfig;
    }

    // Helper function to check if object should be treated as a value (not merged)
    const isValueObject = (obj) => {
      return (
        Array.isArray(obj) ||
        obj instanceof Color ||
        obj instanceof Vector3 ||
        (obj && obj.isColor === true) || // Handle converted THREE.Color objects
        (obj && obj.isVector3 === true)  // Handle converted THREE.Vector3 objects
      );
    };

    // Handle arrays and special objects - replace entirely
    if (isValueObject(currentConfig)) {
      return isValueObject(partialConfig) ? partialConfig : currentConfig;
    }

    // Handle objects - deep merge
    const merged = { ...currentConfig };

    for (const key in partialConfig) {
      if (partialConfig.hasOwnProperty(key)) {
        if (partialConfig[key] !== undefined) {
          // If either value is a "value object", replace entirely
          if (
            isValueObject(partialConfig[key]) ||
            isValueObject(merged[key])
          ) {
            merged[key] = partialConfig[key];
          } else if (
            // Recursively merge if both are plain objects
            typeof partialConfig[key] === "object" &&
            partialConfig[key] !== null &&
            typeof merged[key] === "object" &&
            merged[key] !== null
          ) {
            merged[key] = this.mergeHistogramConfig(partialConfig[key], merged[key]);
          } else {
            // Otherwise, replace the value
            merged[key] = partialConfig[key];
          }
        }
      }
    }

    return merged;
  }
}

export const configSubjectGet = () => {
  if (!configSubject) configSubject = new ConfigSubject();
  return configSubject;
};

