import {openFile} from "jsroot";

export default class FileHandler {
   #url;
   #ready;
   #rootFile;
   #maxInstancesPerLayer;

   constructor(url) {
      this.#url = url;
      this.#ready = this.open(url);
   }

   async open(url) {
      this.#rootFile = await openFile(url);
   }

   async getHistogram(layer, index, selectedChild) {
      if (layer === 0) {
         return this.#rootFile.readObject('hMap');
      } else {
         let path = 'content'
         let totalInstances = this.#maxInstancesPerLayer
            .reduce((acc, value) => {
               return acc * value;
            }, 1);

         for (let i = 0; i <= layer; i++) {
            totalInstances /= this.#maxInstancesPerLayer[i];
            const ind = Math.floor(index / totalInstances);
            path += `/${ind}`;
         }
      }
   }

   async computeMaxInstancesPerLayer() {
      this.#maxInstancesPerLayer = [3400, 130];
      return [3400, 130];
      // await this.#ready;
      // if (!this.#rootFile) return;
      // const hMap = await this.#rootFile.readObject('hMap');
      // console.log(hMap);
      // console.log(this.#rootFile);
      // const temp = hMap.fXaxis.fNbins * hMap.fYaxis.fNbins * hMap.fZaxis.fNbins;
      // let max = [];
      // max.push(temp);
      //
      // const computation = (children, layer = 1) => {
      //    let temp = 0;
      //    if (layer >= max.length) {
      //       max.push(0);
      //    }
      //    children.forEach(value => {
      //       // console.log(value.fName)
      //       // this.#rootFile.readObject(`content/${value.fName}`).then(val => {
      //       //    console.log(val)
      //       // })
      //       this.#rootFile.readObject(`content/288;1`).then(val => {
      //          console.log(val)
      //       })
      //    })
      //    // Object.entries(children).forEach((value, index) => {
      //    //    value[1].forEach(child => {
      //    //       // console.log(child)
      //    //       if (child) {
      //    //          temp = child.fXaxis.fNbins * child.fYaxis.fNbins * child.fZaxis.fNbins;
      //    //          if (temp > max[layer]) {
      //    //             max[layer] = temp;
      //    //          }
      //    //          if (child.children) {
      //    //             computation(child.children, layer + 1);
      //    //          }
      //    //       }
      //    //    });
      //    // });
      //    return max;
      // };
      // const childs = await this.#rootFile.readObject('content')
      // console.log(childs)
      //
      // // computation(childs.fKeys);
      // return max;
   }


}