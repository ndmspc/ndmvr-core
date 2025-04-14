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
         bin_padding_x: {type: "number", default: 1},
         bin_padding_y: {type: "number", default: 1},
         bin_padding_z: {type: "number", default: 1},
         content_min: {type: "number", default: 1},
         bin_scale: {type: "number", default: 1},
      },

      rootObj: undefined,
      instancedMesh: undefined,
      color: new THREE.Color(),
      size: undefined,

      init: function () {
         if (this.data.histogram_source_url) {
            this.loadAndRenderHistogramByHttpRequest(this.data.histogram_source_url);
         }
         this.raycaster = new THREE.Raycaster();
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
               this.rootObj = histo.histogram;
               this.renderHistogram();
            })
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
                  console.log(this.rootObj);
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

                     const content = this.rootObj.fArray[index];

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
               console.log('')
            }
         }
      },

      computePositionFromIndex: function (index) {
         const dimensions = {
            x: this.rootObj.fXaxis.fNbins,
            y: this.rootObj.fYaxis.fNbins,
            z: this.rootObj.fZaxis.fNbins
         }
         const level = 1 + index % (dimensions.x * dimensions.y);

         let x = level % dimensions.x;
         if (x === 0) x = dimensions.x;
         const y = Math.ceil(level / dimensions.x);
         const z = Math.floor(index / (dimensions.x * dimensions.y));
         const position = {x: x, y: y, z: z + 1};
         // console.log(`pos: x: ${x}, y: ${y}, z: ${z}`);
         return (position)
      }

   });
}

export default registerHistogramComponent;
