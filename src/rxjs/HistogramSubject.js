import {ReplaySubject} from "rxjs";
import FileHandler from "../service/FileHandler.js";
import JsonHandler from "../service/JsonHandler.js";

let histogramSubject;

class HistogramSubject {
   #subject;

   constructor() {
      this.#subject = new ReplaySubject(1);
   }

   getStream() {
      return this.#subject.asObservable();
   }

   //TODO better check if the object is already parsed by jsroot
   async next(e) {
      if (typeof e.histogram === 'string') {
         e.histogram = await FileHandler.parseFile(e.histogram);
      } else if (typeof e.histogram === 'object') {
         e.histogram = await JsonHandler.parseJson(e.histogram);
      } else {
         throw new Error('Unsupported data type');
      }
      this.#subject.next(e);
   }
}

export const histogramSubjectGet = () => {
   if (!histogramSubject) histogramSubject = new HistogramSubject();
   return histogramSubject;
}