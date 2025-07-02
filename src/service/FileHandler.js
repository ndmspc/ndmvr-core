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
      hMap.children = {};
      // console.log(this.#rootFile);
      const temp = hMap.fXaxis.fNbins * hMap.fYaxis.fNbins * hMap.fZaxis.fNbins;
      let max = [];
      let childrenAxes = [];
      max.push(temp);

      const computation = async (children, rootFile) => {
         let temp = 0;
         const concurrent = 100;

         for (const key of Object.keys(hMap.children)) {
            for (let i = 0; i < children.length; i += concurrent) {
               const promises = [];

               // Only process items that actually exist
               const batchEnd = Math.min(i + concurrent, children.length);

               for (let j = i; j < batchEnd; j++) {
                  promises.push(rootFile.readObject(`content/${children[j].fName}/${key}`));
               }

               console.log(`Processing batch: ${i} to ${batchEnd-1} (${promises.length} items)`);
               const results = await Promise.all(promises);

               // Actually use the results if needed
               // temp += results.length; // or whatever processing you need
            }
         }
         //
         //    console.log('start')
         // for (const key of Object.keys(hMap.children)) {
         //    for (const index of children) {
         //       // console.log(index)
         //       // console.log(`content/${index.fName}/${key}`);
         //       const th = await rootFile.readObject(`content/${index.fName}/${key}`);
         //       console.log(index.fName)
         //    }
         //    console.log('child done');
         //
         // }
         console.log('done')

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
         hMap.children[axis.fName] = [];
      })
      console.log(hMap)

      // console.log(childs.fKeys)

      computation(childs.fKeys, rootFile);
      return max;
   }


}