import { ReplaySubject } from "rxjs";

let functionSubject;

class FunctionSubject {
  #subject;

  constructor () {
    //replay subject, as only new functions are promoted to updated subscribers
    // and all functions are promoted to new subscriber
    this.#subject = new ReplaySubject();
  }

  /**
   * Function that takes functions and proposes them to histogram with add flag.
   * @param input can be Array of objects with appropriate flags and functions, or single object with flag and function.
   * */
  addFunctions (input) {
    if (!input) return;
    let functions;
    if ((input instanceof Array)) {
      functions = input;
    } else {
      functions = Array.of(input);
    }
    functions.forEach(func => {
      let id = func.target.id;
      if (!(id instanceof Array)) {
        id = Array.of(id);
      }
      this.#subject.next({
        flag: "add",
        target: {
          entity: func.target.entity,
          id: id
        },
        event: func.event,
        function: func.function
      });
    });
  }

  /**
   * Function that takes array of functions and proposes them to histogram with delete flag.
   * */
  removeFunctions (input) {
    if (!input) return;
    let functions;
    if ((input instanceof Array)) {
      functions = input;
    } else {
      functions = Array.of(input);
    }
    functions.forEach(func => {
      console.log(func);
      let id = func.target.id;
      if (!(id instanceof Array)) {
        id = Array.of(id);
      }
      this.#subject.next({
        flag: func.event ? "remove" : "removeAll",
        target: {
          entity: func.target.entity,
          id: id
        },
        event: func.event,
        function: func.function
      });
    });
  }


  getObservable () {
    return this.#subject.asObservable();
  }
}

export const functionSubjectGet = () => {
  if (!functionSubject) functionSubject = new FunctionSubject();
  return functionSubject;
};