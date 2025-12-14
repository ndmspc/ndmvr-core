import { BehaviorSubject } from "rxjs";
import { parseConfig, appendPads } from "../utils/baseUtil.js";
import {Vector3, Color} from "three";
import defaultConfig from "../config-default.json";

let configSubject;

class ConfigSubject {
  #subject;

  constructor () {
    this.#subject = new BehaviorSubject(parseConfig(defaultConfig, {}));
  }

  getObservable () {
    return this.#subject.asObservable();
  }

  getValue () {
    return this.#subject.getValue();
  }

  next (e) {
    // console.log(this.parseConfig(e));
    const parsed = parseConfig(e, this.#subject.getValue());
    this.#subject.next(parsed);
    return parsed;
  }

  appendPads(ids, disp_kind, settings) {
    const updated = appendPads(this.#subject.getValue(), ids, disp_kind, settings);
    this.#subject.next(updated);
  }

  mergeHistogramConfig (partialConfig, defaultConfig = this.#subject.value.config.histogram) {
    // If partialConfig is undefined/null, return defaultConfig
    if (partialConfig === undefined || partialConfig === null) {
      return defaultConfig;
    }

    // If defaultConfig is not an object, return partialConfig
    if (typeof defaultConfig !== "object" || defaultConfig === null) {
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
    if (isValueObject(defaultConfig)) {
      return isValueObject(partialConfig) ? partialConfig : defaultConfig;
    }

    // Handle objects - deep merge
    const merged = { ...defaultConfig };

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

