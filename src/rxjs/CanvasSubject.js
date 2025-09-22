import { ReplaySubject } from "rxjs";

let canvasSubject;

class CanvasSubject {
  #subject;

  constructor () {
    this.#subject = new ReplaySubject(1);
  }

  getObservable () {
    return this.#subject.asObservable();
  }

  next (e) {
    this.#subject.next(e);
  }
}

export const canvasSubjectGet = () => {
  if (!canvasSubject) canvasSubject = new CanvasSubject();
  return canvasSubject;
};