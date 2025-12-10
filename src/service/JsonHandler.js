import { parse } from "jsroot";

export default class JsonHandler {

  #rootFile;

  constructor (obj) {
    this.#rootFile = parse(obj);
  }

  static async parseJson (obj) {
    return parse(obj);
  }

  computeMaxInstancesPerLayer () {
    if (!this.#rootFile) return;
    const temp = this.#rootFile.fXaxis.fNbins * this.#rootFile.fYaxis.fNbins * this.#rootFile.fZaxis.fNbins;
    let max = [];
    max.push(temp);

    const computation = (children, layer = 1) => {
      let temp = 0;
      if (layer >= max.length) {
        max.push(0);
      }
      Object.entries(children).forEach((value, index) => {
        value[1].forEach(child => {
          // console.log(child)
          if (child) {
            temp = child.fXaxis.fNbins * child.fYaxis.fNbins * child.fZaxis.fNbins;
            if (temp > max[layer]) {
              max[layer] = temp;
            }
            if (child.children) {
              computation(child.children, layer + 1);
            }
          }
        });
      });
      return max;
    };
    computation(this.#rootFile.children);
    return Promise.resolve(max);
  }
}