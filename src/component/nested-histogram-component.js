import {functionSubjectGet} from "../rxjs/FunctionSubject.js";
import {filter} from "rxjs";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import RadixCounter from "../utils/radixCounter.js";
import {computeAFrameBinSizePos} from "../utils/histogramRenderUtils.js";

const registerNestedHistogramComponent = () => {
   AFRAME.registerComponent("nested-histogram", {
      schema: {
         bin_padding_x: {type: "number", default: 0.1},
         bin_padding_y: {type: "number", default: 0.1},
         bin_padding_z: {type: "number", default: 0.01},
      },

      rootObj: undefined,
      instancedMesh: undefined,
      raycaster: undefined,
      histoSub: undefined,
      sub: undefined,
      maxInstancesPerLayer: undefined,
      totalInstances: undefined,
      color: new THREE.Color(),
      matrixCache: [],
      selectedChildren: ['likemm'],

      init: function () {
         this.raycaster = new THREE.Raycaster();

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
               this.rootObj = histo.histogram;
               this.maxInstancesPerLayer = this.computeMaxInstancesPerLayer();
               console.log(this.maxInstancesPerLayer)
               this.totalInstances = this.maxInstancesPerLayer
                  .reduce((acc, value) => {
                     return acc * value;
                  }, 1);

               const geometry = new THREE.BoxGeometry(1, 1, 1);
               const material = new THREE.MeshPhongMaterial({color: 0xaaaaaa});
               // const material = new THREE.MeshMatcapMaterial({color: 0xaaaaaa});
               this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.totalInstances);
               const dummy = new THREE.Object3D();
               dummy.scale.set(0, 0, 0);
               dummy.updateMatrix();
               for (let i = 0; i < this.totalInstances; i++) {
                  this.instancedMesh.setMatrixAt(i, dummy.matrix);
               }
               // this.instancedMesh.frustrumCulled = false
               this.instancedMesh.frustumCulled = false;
               this.instancedMesh.instanceMatrix.needsUpdate = true;
               this.el.object3D.add(this.instancedMesh);

               this.renderHistogram(0, this.totalInstances, 0);
               this.matrixCache = [];
            });
      },

      remove: function () {
         this.histoSub.unsubscribe();
         this.sub.unsubscribe();
         this.instancedMesh.dispose();
      },

      renderHistogram: function (startIndex, endIndex, layer) {
         if (!this.rootObj ||
            layer > this.maxInstancesPerLayer.length - 1) return;
         this.currentLayer = layer;

         // if (layer > 0) {
         //    this.renderHistogram(startIndex, endIndex, layer - 1, true);
         // }

         const padding = {
            x: this.data.bin_padding_x,
            y: this.data.bin_padding_y,
            z: this.data.bin_padding_z,
         };

         const matrix = new THREE.Matrix4();
         const position = new THREE.Vector3(0, 0, 0);
         const quaternion = new THREE.Quaternion(); // no rotation
         const scale = new THREE.Vector3(10, 10, 5);

         matrix.compose(position, quaternion, scale);


         const dummy = new THREE.Object3D();

         let k = 0;

         const render = (startIndex, endIndex, currentLayer, obj, limits) => {
            if (currentLayer > layer) return;
            if (!obj) return;
            // console.log(obj)
            const fXbins = obj.fXaxis.fNbins;
            const fYbins = obj.fYaxis.fNbins;
            const fZbins = obj.fZaxis.fNbins;

            const counter = new RadixCounter([fXbins, fYbins, fZbins]);
            // const contentMax = Math.max(...obj.fArray);
            const contentMax = Math.max(...this.filterOutsideContent(obj));
            const isTH3 = obj._typename.substring(0, 3) === 'TH3';
            const stepFor = this.maxInstancesPerLayer
               .slice(currentLayer + 1)
               .reduce((acc, value) => {
                  return acc * value;
               }, 1);
            const limitMatrix = new THREE.Object3D();
            // console.log(limits)
            limitMatrix.matrix.copy(limits);
            limitMatrix.matrix.decompose(limitMatrix.position, limitMatrix.quaternion, limitMatrix.scale);
            limitMatrix.updateMatrix();
            // const limitMatrixSize = {x: limitMatrix.scale.x, y: limitMatrix.scale.y, z: limitMatrix.scale.z}
            // if (startIndex < 100) {
            //    console.log(contentMax)
            //
               // console.log(limitMatrix)
            //
            // console.log('start: ', startIndex, ', end: ', endIndex, ', step: ', stepFor)
            // }
            // if (currentLayer === 1) return;

            for (let i = startIndex; i < endIndex; i += stepFor) {
               const relPos = {x: counter.getValueAt(0), y: counter.getValueAt(1), z: counter.getValueAt(2)}
               const binSizePos = computeAFrameBinSizePos(obj, relPos, padding, limitMatrix.scale, limitMatrix.position);

               const content = obj.getBinContent(relPos.x + 1, relPos.y + 1, relPos.z + 1);
               let scaleFactor;
               if (layer === 0){
                  scaleFactor = 0.2 + 0.8 * this.easeOutCubic(content / contentMax);
               } else {
                  scaleFactor = content / contentMax;
               }
               if (content === 0) {
                  scaleFactor = 0;
               }
               let t = content / contentMax;
               this.color = new THREE.Color(t, 0, 1-t);

               if (currentLayer === 1) {
                  // if (startIndex < 10) {
                  //    console.log('content: ', content, ', contentMax: ', contentMax, ', scale: ', scaleFactor);
                  // }
               }
               dummy.position.set(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)
               dummy.scale.set(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
               dummy.updateMatrix();

               this.matrixCache[i] = dummy.matrix.clone();

               // t = binSizePos.y.size * scaleFactor;
               // if (isTH3) {
               //    binSizePos.x.size *= scaleFactor;
               //    binSizePos.z.size *= scaleFactor;
               // } else {
               //    binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
               // }
               // binSizePos.y.size = t;

               dummy.position.set(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)
               dummy.scale.set(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
               dummy.updateMatrix();

               // if (i < 1000) {
               //    console.log(dummy.scale)
               // console.log(binSizePos)
               // }

               k++;

               if (currentLayer === layer) {
                  this.instancedMesh.setMatrixAt(i, dummy.matrix);
                  this.instancedMesh.setColorAt(i, this.color);
               } else {
                  //    // console.log(obj.children[this.selectedChildren[currentLayer]])
                  //    // console.log(relPos)
                  const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)
                  //    // console.log(obj.getBin(relPos.x, relPos.y, relPos.z))
                  const child = obj.children[this.selectedChildren[currentLayer]][index];
                  if (i === 0) {
                     console.log(this.matrixCache[i])
                  }
                  render(i, i + stepFor, currentLayer + 1, child, this.matrixCache[i]);
               }


               if (!counter.increment(0)) break;
            }
            this.instancedMesh.instanceMatrix.needsUpdate = true;
            this.instancedMesh.instanceColor.needsUpdate = true;
            this.instancedMesh.computeBoundingBox();

         }
         const ex = {x: matrix.scale.x, y: matrix.scale.y, z: matrix.scale.z}
         console.log(matrix)

         render(startIndex, endIndex, 0, this.rootObj, matrix);
         // console.log(k)


         // console.log(stepFor);

      },

      checkIntersection: function (startIndex, endIndex, raycaster) {
         console.log('start: ', startIndex, ', end: ', endIndex);
         const dummy = new THREE.Object3D();

         const intersect = (matrix) => {
            // this.instancedMesh.getMatrixAt(matrix, dummy.matrix);
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();

            // Decompose the matrix into position, rotation, scale
            matrix.decompose(position, quaternion, scale);
            const halfScale = scale.clone().multiplyScalar(0.5);
            const min = position.clone().sub(halfScale);
            const max = position.clone().add(halfScale);

            // Create and return the bounding box
            const boundary = new THREE.Box3(min, max);
            boundary.applyMatrix4(this.instancedMesh.matrixWorld)
            console.log(raycaster.ray.intersectsBox(boundary));
         }
         endIndex -= endIndex % this.maxInstancesPerLayer[this.currentLayer + 1];
         if (startIndex === endIndex) {
            this.instancedMesh.getMatrixAt(startIndex, dummy.matrix);
            console.log(startIndex);
            console.log(startIndex + this.maxInstancesPerLayer[this.currentLayer + 1])
            intersect(dummy.matrix)
            this.instancedMesh.getMatrixAt(startIndex + this.maxInstancesPerLayer[this.currentLayer + 1], dummy.matrix);
            intersect(dummy.matrix)
            return startIndex;
         }



         this.instancedMesh.getMatrixAt(startIndex, dummy.matrix);
         // console.log(dummy.matrix);
         const posA = new THREE.Vector3().setFromMatrixPosition(dummy.matrix);
         let sizeOffset = new THREE.Vector3(
            dummy.matrix.elements[0] * 0.5,
            dummy.matrix.elements[5] * 0.5,
            -dummy.matrix.elements[10] * 0.5
         );
         posA.sub(sizeOffset);

         const half = Math.ceil((startIndex + endIndex) / 2);
         // console.log(half)
         this.instancedMesh.getMatrixAt(half - 1, dummy.matrix);
         const posB = new THREE.Vector3().setFromMatrixPosition(dummy.matrix);
         //----DANGER!!---- pravdepodobne treba prerobit na decompose (bez rot funguje)
         sizeOffset = new THREE.Vector3(
            dummy.matrix.elements[0] * 0.5,
            dummy.matrix.elements[5] * 0.5,
            -dummy.matrix.elements[10] * 0.5
         );
         posB.add(sizeOffset);
         const boundingBox = new THREE.Box3().setFromPoints([posA, posB]);
         boundingBox.applyMatrix4(this.instancedMesh.matrixWorld);

         if (raycaster.ray.intersectsBox(boundingBox)) {
            return this.checkIntersection(startIndex, half, raycaster);
         } else {
            return this.checkIntersection(half, endIndex, raycaster);
         }

         // const helper = new THREE.Box3Helper(boundingBox, 0x00ff00);
         // helper.updateMatrix();
         // this.el.object3D.add(helper);

      },

      filterOutsideContent: function (rootObj) {
         const binsPerAxis = [1];
         binsPerAxis.push((rootObj.fXaxis.fNbins + 2) * binsPerAxis[0]);
         binsPerAxis.push((rootObj.fYaxis.fNbins + 2) * binsPerAxis[1]);

         // console.log(rootObj.fArray);
         // console.log(binsPerAxis);

         const original = rootObj.fArray;
         const filtered = [];

         // Calculate total dimensions including overflow/underflow bins
         const xTotal = rootObj.fXaxis.fNbins + 2;
         const yTotal = rootObj.fYaxis.fNbins + 2;
         const zTotal = rootObj.fZaxis.fNbins + 2;

         // Determine if we need to exclude edge bins for each dimension
         const excludeX = rootObj.fXaxis.fNbins > 1;
         const excludeY = rootObj.fYaxis.fNbins > 1;
         const excludeZ = rootObj.fZaxis.fNbins > 1;

         // Calculate valid ranges
         const xStart = excludeX ? 1 : 0;
         const xEnd = excludeX ? xTotal - 1 : xTotal;
         const yStart = excludeY ? 1 : 0;
         const yEnd = excludeY ? yTotal - 1 : yTotal;
         const zStart = excludeZ ? 1 : 0;
         const zEnd = excludeZ ? zTotal - 1 : zTotal;

         // Handle different dimensionalities
         if (rootObj.fZaxis.fNbins <= 1 && rootObj.fYaxis.fNbins <= 1) {
            // 1D histogram - only X axis matters
            for (let x = xStart; x < xEnd; x++) {
               filtered.push(original[x]);
            }
         } else if (rootObj.fZaxis.fNbins <= 1) {
            // 2D histogram - X and Y axes
            for (let y = yStart; y < yEnd; y++) {
               for (let x = xStart; x < xEnd; x++) {
                  const index = y * xTotal + x;
                  filtered.push(original[index]);
               }
            }
         } else {
            // 3D histogram - X, Y, and Z axes
            for (let z = zStart; z < zEnd; z++) {
               for (let y = yStart; y < yEnd; y++) {
                  for (let x = xStart; x < xEnd; x++) {
                     const index = z * (xTotal * yTotal) + y * xTotal + x;
                     filtered.push(original[index]);
                  }
               }
            }
         }
         return filtered;
      },

      easeOutQuad: function (t) {
         return 1 - (1 - t) * (1 - t);
      },

      easeOutCubic: function (t) {
         return 1 - Math.pow(1 - t, 3);
      },


      getInstancesArray: function (startIndex, endIndex, layer, array = undefined) {
         let temp;
         if (layer === 0) {
            return Array.of(this.rootObj);
         } else if (layer > 0) {
            //temp zatial stale rootObj
            temp = this.getInstancesArray(startIndex, endIndex, layer - 1);
            temp.forEach((value, index) => {
               let child = value.children[this.selectedChildren[layer - 1]];
               child = child.slice(
                  Math.floor(startIndex / this.maxInstancesPerLayer[layer]),
                  Math.floor(endIndex / this.maxInstancesPerLayer[layer])
               )
               console.log(child);
            })
            // temp.children[0].slice(
            //    Math.floor(startIndex / this.maxInstancesPerLayer[layer]),
            //    Math.floor(endIndex / this.maxInstancesPerLayer[layer])
            //    );
         }

      },

      computeMaxInstancesPerLayer: function () {
         if (!this.rootObj) return;
         const temp = this.rootObj.fXaxis.fNbins * this.rootObj.fYaxis.fNbins * this.rootObj.fZaxis.fNbins;
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
         computation(this.rootObj.children);
         return max;
      },

      computeIndexFromPosition: function (x, y, z) {
         let histogramObj;
         if (this.mappingHistogram) {
            histogramObj = this.mappingHistogram;
         } else {
            histogramObj = this.rootObj;
         }
         return (x
            + (histogramObj.fXaxis.fNbins * (y - 1))
            + (histogramObj.fXaxis.fNbins * histogramObj.fYaxis.fNbins * (z - 1))
         )
      }

   })
}

export default registerNestedHistogramComponent;