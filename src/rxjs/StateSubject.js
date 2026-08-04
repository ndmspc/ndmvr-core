import { BehaviorSubject } from "rxjs";
import { histogramSubjectGet } from "./HistogramSubject.js";
import { computeRenderRangeIterator } from "../utils/histogramUtils.js";

let stateSubjectMap = new Map();

class StateSubject {
  #subject;
  #id;

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

  next (e) {
    histogramSubjectGet().getCurrentHistogram(this.#id).then(histo => {
      e.axisRanges = computeRenderRangeIterator(histo?.obj, e.axisRanges);
      this.#subject.next(e);
    })
  }
}

export const stateSubjectGet = (id) => {
  if (!id) throw new Error("StateSubject id is undefined");
  if (!stateSubjectMap.get(id)) stateSubjectMap.set(id, new StateSubject(id));
  return stateSubjectMap.get(id);
};