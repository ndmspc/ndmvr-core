import { BehaviorSubject } from "rxjs";
import { histogramSubjectGet } from "./HistogramSubject.js";
import { computeRenderRangeIterator } from "../utils/histogramUtils.js";

let stateSubjectMap = new Map();

class StateSubject {
  #subject;
  #id;
  #binding;
  #requestVersion = 0;

  constructor (id) {
    this.#id = id;
    this.#subject = new BehaviorSubject({
      sets: [],
      selectedSet: [],
      arrays: ["content"],
      selectedArray: "content",
      minMaxValue: [],
      availableAxes: []
    });
  }

  getObservable () {
    return this.#subject.asObservable();
  }

  getValue () {
    return this.#subject.getValue();
  }

  // Bind state normalization to the live painter, including direct API users.
  _bind (owner, histogram, state) {
    this.#binding = { owner, histogram };
    this.#requestVersion++;
    this.#subject.next(structuredClone(state));
  }

  _release (owner) {
    if (this.#binding?.owner !== owner) return;
    this.#binding = undefined;
    this.#requestVersion++;
  }

  next (e) {
    const snapshot = structuredClone(e);
    const version = ++this.#requestVersion;
    const histogram = this.#binding
      ? Promise.resolve(this.#binding.histogram)
      : histogramSubjectGet().getCurrentHistogram(this.#id).then(histo => histo?.obj);

    histogram.then(obj => {
      if (version !== this.#requestVersion || !obj) return;
      if (snapshot.axisRanges) {
        snapshot.axisRanges = computeRenderRangeIterator(obj, snapshot.axisRanges);
      }
      this.#subject.next(snapshot);
    }).catch(error => {
      if (version === this.#requestVersion) {
        console.error("Failed to update histogram state:", error);
      }
    });
  }
}

export const stateSubjectGet = (id) => {
  if (!id) throw new Error("StateSubject id is undefined");
  if (!stateSubjectMap.get(id)) stateSubjectMap.set(id, new StateSubject(id));
  return stateSubjectMap.get(id);
};
