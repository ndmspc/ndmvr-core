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

   static async open(url) {
      return openFile(url);
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

   static async parseFile(obj) {
      const rootFile = await this.open(obj)
      const maxInstancesPerLayer = await this.computeMaxInstancesPerLayer(rootFile);
   }

   static async computeMaxInstancesPerLayer(rootFile) {
      // this.#maxInstancesPerLayer = [3400, 130];
      // return [3400, 130];
      // await this.#ready;
      if (!rootFile) return;
      const hMap = await rootFile.readObject('hMap');
      // console.log(hMap);
      // console.log(this.#rootFile);
      const temp = hMap.fXaxis.fNbins * hMap.fYaxis.fNbins * hMap.fZaxis.fNbins;
      let max = [];
      let childrenAxes = [];
      max.push(temp);

      const computation = (children, rootFile) => {
         let temp = 0;
         // if (layer >= max.length) {
         //    max.push(0);
         // }
         children.forEach(index => {
            // console.log(value.fName)
            // rootFile.readObject(`content/${index.fName}/`).then(val => {
            //    console.log(val)
            // })
            // this.#rootFile.readObject(`content/288;1`).then(val => {
            //    console.log(val)
            // })
         })
         // Object.entries(children).forEach((value, index) => {
         //    value[1].forEach(child => {
         //       // console.log(child)
         //       if (child) {
         //          temp = child.fXaxis.fNbins * child.fYaxis.fNbins * child.fZaxis.fNbins;
         //          if (temp > max[layer]) {
         //             max[layer] = temp;
         //          }
         //          if (child.children) {
         //             computation(child.children, layer + 1);
         //          }
         //       }
         //    });
         // });
         return max;
      };
      const childs = await rootFile.readObject('content')
      const childrenAxesDir = await rootFile.readObject(`content/${childs.fKeys[0].fName}`)
      childrenAxesDir.fKeys.forEach(axis => {
         childrenAxes.push(axis.fName);
      })
      console.log(childrenAxes)

      console.log(childs.fKeys[0])

      computation(childs.fKeys, rootFile);
      return max;
   }


}