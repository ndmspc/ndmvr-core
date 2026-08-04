import { firstValueFrom, ReplaySubject, take } from "rxjs";
import FileHandler from "../service/FileHandler.js";
import JsonHandler from "../service/JsonHandler.js";
import { parseConfig } from "../utils/baseUtil.js";

let histogramSubject;

class HistogramSubject {
  #subjects = new Map();  // id → ReplaySubject(1)

  getStream (id) {
    if (!this.#subjects.has(id)) {
      this.#subjects.set(id, new ReplaySubject(1));
    }
    return this.#subjects.get(id).asObservable();
  }

  async getCurrentHistogram (id) {
    if (!this.#subjects.has(id)) {
      return null;
    }
    return firstValueFrom(
      this.#subjects.get(id).pipe(take(1))
    );
  }

  async next (e) {
    if (!e.id) throw new Error("Missing id in event");

    // Preprocess histogram
    if (typeof e.obj === "string") {
      e.obj = await FileHandler.parseFile(e.obj);
    } else if (typeof e.obj === "object") {
      e.obj = await JsonHandler.parseJson(e.obj);
      e.opts = e.opts || {};
      e.opts.config = parseConfig(e.opts.config);
    } else {
      throw new Error("Unsupported data type");
    }

    if (!this.#subjects.has(e.id)) {
      this.#subjects.set(e.id, new ReplaySubject(1));
    }
    this.#subjects.get(e.id).next(e);
  }
}

export const histogramSubjectGet = () => {
  if (!histogramSubject) histogramSubject = new HistogramSubject();
  return histogramSubject;
};
