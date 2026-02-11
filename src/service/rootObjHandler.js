import FileHandler from "./FileHandler.js";
import JsonHandler from "./JsonHandler.js";

export default class RootObjHandler {

  #handler;
  #maxInstancesPerLayer;
  #ready;

  constructor (obj) {
    if (typeof obj.obj === "string") {
      this.#handler = new FileHandler(obj.obj);
    } else if (typeof obj.obj === "object") {
      this.#handler = new JsonHandler(obj.obj);
    } else {
      throw new Error("Unsupported data type");
    }
    this.#ready = this.#handler.computeMaxInstancesPerLayer().then(value => {
      this.#maxInstancesPerLayer = value;
    });
  }

  async getHistogram (layer, index, selectedChild) {
    return this.#handler.getHistogram(layer, index, selectedChild);
  }

  async getMaxInstancesPerLayer () {
    await this.#ready;
    // return 'gagagag'
    return this.#maxInstancesPerLayer;
  }
}