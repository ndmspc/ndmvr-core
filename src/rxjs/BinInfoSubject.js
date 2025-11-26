import { ReplaySubject } from "rxjs";

let binInfoSubject;

class BinInfoSubject {
  #subject;

  constructor () {
    this.#subject = new ReplaySubject(1);
  };

  getObservable () {
    return this.#subject.asObservable();
  }

  getValue () {
    return this.#subject.getValue();
  }

  next (e) {
    this.#subject.next(e);
  }
}

export const binInfoSubjectGet = () => {
  if (!binInfoSubject) binInfoSubject = new BinInfoSubject();
  return binInfoSubject;
};