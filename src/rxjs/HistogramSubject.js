import { ReplaySubject } from "rxjs";
import FileHandler from "../service/FileHandler.js";
import JsonHandler from "../service/JsonHandler.js";

let histogramSubject;

class HistogramSubject {
    #subjects = new Map();  // id → ReplaySubject(1)

    getStream(id) {
        console.log('getting subject: ', id);
        if (!this.#subjects.has(id)) {
            this.#subjects.set(id, new ReplaySubject(1));
        }

        return this.#subjects.get(id).asObservable();
    }

    async next(e) {
        if (!e.id) throw new Error("Missing id in event");

        // Preprocess histogram
        if (typeof e.histogram === "string") {
            e.histogram = await FileHandler.parseFile(e.histogram);
        } else if (typeof e.histogram === "object") {
            e.histogram = await JsonHandler.parseJson(e.histogram);
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
