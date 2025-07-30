import "aframe";
import {parse} from "jsroot";
import {computeAFrameBinSizePos, stringToXYZ} from "../utils/histogramRenderUtils.js";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import {filter} from "rxjs";
import {functionSubjectGet} from "../rxjs/FunctionSubject.js";

const registerHistogramComponent = () => {

   AFRAME.registerComponent("histogram", {
      schema: {
         histogram_source_url: {type: "string", default: ""}, //url for the http request
         size: {type: "string", default: ""},
         bin_padding_x: {type: "number", default: 5},
         bin_padding_y: {type: "number", default: 5},
         bin_padding_z: {type: "number", default: 5},
         content_min: {type: "number", default: 1},
         bin_scale: {type: "number", default: 1},
         root_mapping: {type: "boolean", default: true}
      },

      rootObj: undefined,
      instancedMesh: undefined,
      color: new THREE.Color(),
      size: undefined,
      mappingHistogram: undefined,
      sets: undefined,
      selected: undefined,

      init: function () {
         if (this.data.histogram_source_url) {
            this.loadAndRenderHistogramByHttpRequest(this.data.histogram_source_url);
         }
         // this.raycaster = new THREE.Raycaster();
         this.mouse = new THREE.Vector2();
         if (this.data.size) {
            this.size = stringToXYZ(this.data.size);
         }

         this.sub = functionSubjectGet().getObservable()
            .pipe(filter(e =>
               (e.target.entity === this.attrName) && ((e.target.id.includes('*')) || (e.target.id.includes(this.data.id)))))
            .subscribe((f) => {
               if (f.flag === 'add') {
                  this.el.addEventListener(f.event, f.function);
               } else if (f.flag === 'remove') {
                  this.el.removeEventListener(f.event, f.function);
               }
            });

         this.histoSub = histogramSubjectGet().getStream()
            .pipe(
               filter(e => e.id === this.el.id)
            )
            .subscribe((histo) => {
               while (this.el.firstChild) {
                  this.el.removeChild(this.el.lastChild);
               }
               this.el.object3D.remove(this.instancedMesh);
               if (histo.histogram?.mapping) {
                  this.rootObj = histo.histogram.mapping;
                  this.mappingHistogram = histo.histogram.mapping;
                  this.selected = histo.histogram.selected;
                  this.sets = histo.histogram.sets;
                  this.renderMappingHistogram(this.selected);
               } else {
                  this.rootObj = histo.histogram;
                  this.renderHistogram();
               }
            });
         setTimeout(() => {
            this.el.setAttribute('histogram-border', '');
         }, 0);
      },

      remove: function () {
         this.histoSub.unsubscribe();
      },

      loadAndRenderHistogramByHttpRequest: function (url) {
         if (url !== "") {
            fetch(url)
               .then(response => response.json())
               .then(histJsObj => {
                  //We use JSRoot's parse instead of httpRequest to be able to process JSRoot's json
                  //from various sources (http, socket, ...)
                  //JSRoot's parse accepts both json string and an object parsed from it
                  this.rootObj = parse(histJsObj);
                  this.renderHistogram();


               })
               .catch(error => console.error('Error when fetching and rendering histogram:', error));

            //alternate form of fetching, using SRoot's httpRequest:
            //(we need )
            // window.jsRootProvider.httpRequest(url,"object")
            //   .then(histObj => {
            //     this.rootObj = histObj;
            //     this.renderHistogram();
            //   });
         }
      },


      renderHistogram: function () {
         if (this.rootObj) {
            // console.log("renderHistogram>", this.el.id, this.data.histogram_source_url, "rootMinMaxBinSizes:", getRootMinMaxBinSizes(this.rootObj));

            const fXbins = this.rootObj.fXaxis.fNbins;
            const fYbins = this.rootObj.fYaxis.fNbins;
            const fZbins = this.rootObj.fZaxis.fNbins;

            const padding = {
               x: this.data.bin_padding_x,
               y: this.data.bin_padding_y,
               z: this.data.bin_padding_z,
            };
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshPhongMaterial({color: 0xffffff});
            this.instancedMesh = new THREE.InstancedMesh(geometry, material, fXbins * fYbins * fZbins);
            const dummy = new THREE.Object3D();
            const entriesMax = Math.max(...this.rootObj.fArray);
            const isTH3 = this.rootObj._typename.substring(0, 3) === 'TH3';
            let max;
            isTH3 ? max = entriesMax : max = entriesMax / 5;

            let index = 0;
            let recursiveFlag = true;

            for (let relZ = 1; relZ <= fZbins; relZ++) {
               for (let relY = 1; relY <= fYbins; relY++) {
                  for (let relX = 1; relX <= fXbins; relX++) {

                     let content;
                     if (this.data.root_mapping) {
                        content = this.rootObj.getBinContent(relX, relY, relZ);
                     } else {
                        content = this.rootObj.fArray[index];
                     }

                     if (content < this.data.content_min) {
                        dummy.scale.set(0, 0, 0);
                        dummy.updateMatrix();
                        this.instancedMesh.setMatrixAt(index, dummy.matrix);
                        index += 1;
                        continue;
                     }

                     const relPos = {x: relX, y: relY, z: relZ};
                     const scaleFactor = (content / max) * this.data.bin_scale;
                     const pos = computeAFrameBinSizePos(this.rootObj, relPos, padding, this.size);

                     // pos.y.size *= scaleFactor;
                     // if (isTH3) {
                     //    pos.x.size *= scaleFactor;
                     //    pos.z.size *= scaleFactor;
                     // }

                     if (content?._typename) {
                        const histoRecursive = document.createElement('a-entity');
                        histoRecursive.setAttribute('histogram',
                           'size: ' + `${pos.x.size} ${pos.z.size} ${pos.y.size}`);
                        histoRecursive.id = `${this.el.id}x${relX}${relY}${relZ}`;
                        histoRecursive.setAttribute('position',
                           `${pos.x.pos} ${pos.y.pos - (pos.y.size / 2)} ${pos.z.pos} `);
                        this.el.appendChild(histoRecursive);
                        histogramSubjectGet().next(
                           {id: `${this.el.id}x${relX}${relY}${relZ}`, histogram: content});

                        //instancedMesh cannot handle if some index is skipped
                        dummy.scale.set(0, 0, 0);
                        dummy.updateMatrix();
                        this.instancedMesh.setMatrixAt(index, dummy.matrix);

                        index += 1;
                        continue;
                     }
                     recursiveFlag = false;

                     dummy.scale.set(pos.x.size, pos.y.size, pos.z.size);
                     dummy.position.set(pos.x.pos, pos.y.pos, pos.z.pos);
                     dummy.updateMatrix();
                     this.instancedMesh.setMatrixAt(index, dummy.matrix);
                     this.instancedMesh.setColorAt(index, this.color);
                     index += 1;
                  }
               }
            }
            if (recursiveFlag === false) {
               this.el.object3D.add(this.instancedMesh)
            }
         }
      },

      /**
       * Render nested histogram, where mapping histogram in this component is needed.
       * In loop, it computes position, size and create histogram (is taken from array of sets),
       * where each histogram will be bin of mapping histogram.
       * @param set Defines name of set, from which histograms in (mapping histogram) bins will be rendered.
       * */
      renderMappingHistogram: function (set) {
         if (this.mappingHistogram) {
            while (this.el.firstChild) {
               this.el.removeChild(this.el.lastChild);
            }
            // console.log("renderHistogram>", this.el.id, this.data.histogram_source_url, "rootMinMaxBinSizes:", getRootMinMaxBinSizes(this.rootObj));

            const fXbins = this.mappingHistogram.fXaxis.fNbins;
            const fYbins = this.mappingHistogram.fYaxis.fNbins;
            const fZbins = this.mappingHistogram.fZaxis.fNbins;

            const padding = {
               x: this.data.bin_padding_x,
               y: this.data.bin_padding_y,
               z: this.data.bin_padding_z,
            };

            const entriesMax = Math.max(...this.mappingHistogram.fArray);
            const isTH3 = this.mappingHistogram._typename.substring(0, 3) === 'TH3';
            let max;
            isTH3 ? max = entriesMax : max = entriesMax / 5;
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshPhongMaterial({color: 0xffffff});
            this.instancedMesh = new THREE.InstancedMesh(geometry, material, fXbins * fYbins * fZbins);
            this.instancedMesh.frustumCulled = false;
            // this.instancedMesh.count = 0;
            const dummy = new THREE.Object3D();

            let index = 0;
            let recursiveFlag = true;

            for (let relZ = 1; relZ <= fZbins; relZ++) {
               for (let relY = 1; relY <= fYbins; relY++) {
                  for (let relX = 1; relX <= fXbins; relX++) {

                     let content;
                     if (this.data.root_mapping) {
                        content = this.mappingHistogram.getBinContent(relX, relY, relZ);
                     } else {
                        content = this.mappingHistogram.fArray[index];
                     }

                     if (content === 0) {
                        dummy.scale.set(0, 0, 0);
                        dummy.updateMatrix();
                        // this.instancedMesh.count += 1;
                        this.instancedMesh.setMatrixAt(index, dummy.matrix);
                        index += 1;
                        continue;
                     }

                     const relPos = {x: relX, y: relY, z: relZ};
                     const pos = computeAFrameBinSizePos(this.mappingHistogram, relPos, padding, this.size);

                     if (content < 0) {
                        dummy.scale.set(pos.x.size, pos.y.size, pos.z.size);
                        dummy.position.set(pos.x.pos, pos.y.pos, pos.z.pos);
                        dummy.updateMatrix();
                        // this.instancedMesh.count += 1;
                        this.instancedMesh.setMatrixAt(index, dummy.matrix);
                        this.instancedMesh.setColorAt(index, this.color);
                        index += 1;
                        recursiveFlag = false;
                        continue;
                     }

                     dummy.scale.set(0, 0, 0);
                     dummy.position.set(pos.x.pos, pos.y.pos, pos.z.pos);

                     dummy.updateMatrix();
                     this.instancedMesh.setMatrixAt(index, dummy.matrix);

                     const histoRecursive = document.createElement('a-entity');
                     histoRecursive.setAttribute('histogram',
                        'size: ' + `${pos.x.size} ${pos.z.size} ${pos.y.size}`);
                     histoRecursive.id = `${this.el.id}x${relX}_${relY}_${relZ}`;
                     histoRecursive.setAttribute('position',
                        `${pos.x.pos} ${pos.y.pos - (pos.y.size / 2)} ${pos.z.pos} `);
                     this.el.appendChild(histoRecursive);
                     histogramSubjectGet().next(
                        {
                           id: `${this.el.id}x${relX}_${relY}_${relZ}`,
                           histogram: parse(this.sets[set].arr.at(content))
                        });

                     index += 1;
                  }
               }
            }
            if (recursiveFlag === false) {
               this.el.object3D.add(this.instancedMesh)
            }
         }
      },

      hideAllChildHistograms: function () {
         if (!this.mappingHistogram) return;
         while (this.el.firstChild) {
            this.el.removeChild(this.el.lastChild);
         }
         this.el.object3D.remove(this.instancedMesh);
         this.instancedMesh.dispose();
         this.mappingHistogram.fArray = this.mappingHistogram.fArray.map(x => -Math.abs(x));
         this.renderMappingHistogram(this.selected);
      },

      showAllChildHistograms: function () {
         if (!this.mappingHistogram) return;
         while (this.el.firstChild) {
            this.el.removeChild(this.el.lastChild);
         }
         this.el.object3D.remove(this.instancedMesh);
         this.instancedMesh.dispose();
         this.mappingHistogram.fArray = this.mappingHistogram.fArray.map(x => Math.abs(x));
         this.renderMappingHistogram(this.selected);
      },

      showChildHistogram: function (x, y, z) {
         if (!this.mappingHistogram) return;
         let content;
         if (this.data.root_mapping) {
            content = this.mappingHistogram.getBinContent(x, y, z);
         } else {
            content = this.mappingHistogram.fArray[index];
         }
         const position = {
            x: x,
            y: y,
            z: z
         }
         const padding = {
            x: this.data.bin_padding_x,
            y: this.data.bin_padding_y,
            z: this.data.bin_padding_z,
         };

         const index = this.mappingHistogram.getBin(x, y, z);

         this.mappingHistogram.setBinContent(index, Math.abs(content));
         const instancedMeshIndex = this.computeIndexFromPosition(x, y, z);
         const binPos = computeAFrameBinSizePos(this.mappingHistogram, position, padding, this.size);
         const dummy = new THREE.Object3D();
         dummy.scale.set(0, 0, 0);
         dummy.position.set(binPos.x.pos, binPos.y.pos, binPos.z.pos);
         dummy.updateMatrix();

         this.instancedMesh.setMatrixAt(instancedMeshIndex - 1, dummy.matrix);
         this.instancedMesh.instanceMatrix.needsUpdate = true;

         const histoRecursive = document.createElement('a-entity');
         histoRecursive.setAttribute('histogram',
            'size: ' + `${binPos.x.size} ${binPos.z.size} ${binPos.y.size}`);
         histoRecursive.id = `${this.el.id}x${x}_${y}_${z}`;
         histoRecursive.setAttribute('position',
            `${binPos.x.pos} ${binPos.y.pos - (binPos.y.size / 2)} ${binPos.z.pos} `);
         this.el.appendChild(histoRecursive);
         histogramSubjectGet().next(
            {
               id: `${this.el.id}x${x}_${y}_${z}`,
               histogram: parse(this.sets[this.selected].arr.at(content))
            });

      },

      hideChildHistogram: function (x, y, z) {
         const parentHistogram = this.el.parentEl.components['histogram'];
         if (parentHistogram?.mappingHistogram) {
            //z id vytiahnem poziciu v parent histograme
            let position = this.el.id
               .replace(parentHistogram.el.id + 'x', '')
               .split('_')
               .map(x => Number(x));
            position = {
               x : position[0],
               y : position[1],
               z : position[2]
            }
            const padding = {
               x: parentHistogram.data.bin_padding_x,
               y: parentHistogram.data.bin_padding_y,
               z: parentHistogram.data.bin_padding_z,
            };
            // console.log(Number(position[0]), ' ', Number(position[1]), ' ', Number(position[1]), ' ')
            const index = parentHistogram.mappingHistogram.getBin(position.x, position.y, position.z);
            const content = parentHistogram.mappingHistogram.getBinContent(position.x, position.y, position.z);

            parentHistogram.mappingHistogram.setBinContent(index, -Math.abs(content));
            const instancedMeshIndex = parentHistogram.computeIndexFromPosition(position.x, position.y, position.z);

            const binPos = computeAFrameBinSizePos(parentHistogram.mappingHistogram, position, padding, parentHistogram.size);
            const dummy = new THREE.Object3D();
            dummy.scale.set(binPos.x.size, binPos.y.size, binPos.z.size);
            dummy.position.set(binPos.x.pos, binPos.y.pos, binPos.z.pos);
            dummy.updateMatrix();

            console.log(instancedMeshIndex);
            parentHistogram.instancedMesh.setMatrixAt(instancedMeshIndex - 1, dummy.matrix);
            parentHistogram.instancedMesh.instanceMatrix.needsUpdate = true;

            this.instancedMesh.dispose();
            parentHistogram.el.removeChild(this.el);
         }
      },

      /**
       * Computes position in histogram
       * */
      computePositionFromIndex: function (index) {
         let dimensions;
         if (this.mappingHistogram) {
            dimensions = {
               x: this.mappingHistogram.fXaxis.fNbins,
               y: this.mappingHistogram.fYaxis.fNbins,
               z: this.mappingHistogram.fZaxis.fNbins
            }
         } else {
            dimensions = {
               x: this.rootObj.fXaxis.fNbins,
               y: this.rootObj.fYaxis.fNbins,
               z: this.rootObj.fZaxis.fNbins
            }
         }

         const level = 1 + index % (dimensions.x * dimensions.y);

         let x = level % dimensions.x;
         if (x === 0) x = dimensions.x;
         const y = Math.ceil(level / dimensions.x);
         const z = Math.floor(index / (dimensions.x * dimensions.y));
         const position = {x: x, y: y, z: z + 1};
         // console.log(`pos: x: ${x}, y: ${y}, z: ${z}`);
         return (position)
      },

      computeIndexFromPosition: function (x, y, z) {
         let histogramObj;
         if (this.mappingHistogram) {
            histogramObj = this.mappingHistogram;
         } else {
            histogramObj = this.rootObj;
         }
         return (x
            + (histogramObj.fXaxis.fNbins * (y -1))
            + (histogramObj.fXaxis.fNbins * histogramObj.fYaxis.fNbins * (z -1))
         )
      }
   });
}

export default registerHistogramComponent;
