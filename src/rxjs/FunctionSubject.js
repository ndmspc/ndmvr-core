import {ReplaySubject} from "rxjs";

let functionSubject;

class FunctionSubject {
   #state;
   #subject;

   constructor() {
      this.#state = new Map();
      //replay subject, as only new functions are promoted to updated subscribers
      // and all functions are promoted to new subscriber
      this.#subject = new ReplaySubject();
   }

   /**
    * Function that takes functions and proposes them to histogram with add flag.
    * @param input can be Array of objects with appropriate flags and functions, or single object with flag and function.
    * */
   addFunctions(input) {
      if (!input) return;
      let functions;
      if ((input instanceof Array)) {
         functions = input;
      } else {
         functions = Array.of(input);
      }
      functions.forEach(func => {
         let functionSet = this.#state.get(func.event)
         if (!functionSet) {
            const set = new Set();
            this.#state.set(func.event, set);
            functionSet = set;
         }
         if (functionSet.has(func.function)) return;
         functionSet.add(func.function);
         let id = func.target.id;
         if (!(id instanceof Array)) {
            id = Array.of(id);
         }
         this.#subject.next({
            flag: 'add',
            target: {
               entity: func.target.entity,
               id: id
            },
            event: func.event,
            function: func.function
         });
      })
   }

   /**
    * Function that takes array of functions and proposes them to histogram with delete flag.
    * */
   removeFunctions(input) {
      if (!input) return;
      let functions;
      if ((input instanceof Array)) {
         functions = input;
      } else {
         functions = Array.of(input);
      }
      functions.forEach(func => {
         let functionSet = this.#state.get(func.event)
         if (!functionSet) return;
         if (!functionSet.has(func.function)) return;
         functionSet.delete(func.function);
         let id = func.target.id;
         if (!(id instanceof Array)) {
            id = Array.of(id);
         }
         this.#subject.next({
            flag: 'delete',
            target: {
               entity: func.target.entity,
               id: id
            },
            event: func.event,
            function: func.function
         });
      })
   }

   getObservable() {
      return this.#subject.asObservable();
   }
}

const functionSubjectGet = () => {
   if (!functionSubject) functionSubject = new FunctionSubject();
   return functionSubject;
}

export default functionSubjectGet;