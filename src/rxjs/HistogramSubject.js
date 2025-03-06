import {ReplaySubject} from "rxjs";

let histogramSubject;

class HistogramSubject {
   #subject;

   constructor() {
      this.#subject = new ReplaySubject(1);
   }

   getStream() {
      return this.#subject.asObservable();
   }

   next(e) {
      this.#subject.next(e);
   }
}

export const histogramSubjectGet = () => {
   if (!histogramSubject) histogramSubject = new HistogramSubject();
   return histogramSubject;
}