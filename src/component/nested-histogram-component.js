import {functionSubjectGet} from "../rxjs/FunctionSubject.js";
import {filter} from "rxjs";
import {histogramSubjectGet} from "../rxjs/HistogramSubject.js";
import RadixCounter from "../utils/radixCounter.js";
import {changePos, computeAFrameBinSizePos, rootSizePosToAFrame} from "../utils/histogramRenderUtils.js";

const registerNestedHistogramComponent = () => {
   AFRAME.registerComponent("nested-histogram", {
      schema: {
         bin_padding_x: {type: "number", default: 1},
         bin_padding_y: {type: "number", default: 1},
         bin_padding_z: {type: "number", default: 0.1},
      },

      rootObj: undefined,
      instancedMesh: undefined,
      raycaster: undefined,
      histoSub: undefined,
      sub: undefined,
      maxInstancesPerLayer: undefined,
      totalInstances: undefined,
      color: new THREE.Color(),
      matrixCache: undefined,
      selectedChildren: ['unlikepm'],

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
               this.matrixCache = new Array(this.maxInstancesPerLayer.length).fill().map(() => []);
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

               this.renderHistogram(0, this.totalInstances, 1);
               console.log(this.matrixCache)
               // this.matrixCache = [];
            });
      },

      remove: function () {
         this.histoSub.unsubscribe();
         this.sub.unsubscribe();
         // this.instancedMesh.dispose();
         this.matrixCache = [];
      },

      renderHistogram: function (startIndex, endIndex, layer) {
         if (!this.rootObj ||
            layer > this.maxInstancesPerLayer.length - 1) return;
         this.currentLayer = layer;

         const padding = {
            x: this.data.bin_padding_x,
            y: this.data.bin_padding_y,
            z: this.data.bin_padding_z,
         };

         const matrix = {
            position: new THREE.Vector3(0, 0, 0),
            scale: new THREE.Vector3(10, 10, 10)
         };

         const dummy = new THREE.Object3D();

         const render = (startIndex, endIndex, currentLayer, obj, limits) => {
            if (currentLayer > layer) return;
            if (!obj) return;
            // console.log(obj)
            const fXbins = obj.fXaxis.fNbins;
            const fYbins = obj.fYaxis.fNbins;
            const fZbins = obj.fZaxis.fNbins;
            if (currentLayer === 1 && startIndex === 0) {
               // console.log(limits)
            }

            const counter = new RadixCounter([fXbins, fYbins, fZbins]);
            // const contentMax = Math.max(...obj.fArray);
            const contentMax = Math.max(...this.filterOutsideContent(obj));
            const isTH3 = obj._typename.substring(0, 3) === 'TH3';
            const stepFor = this.maxInstancesPerLayer
               .slice(currentLayer + 1)
               .reduce((acc, value) => {
                  return acc * value;
               }, 1);

            // const limitMatrix = new THREE.Object3D();
            // console.log(limits)
            // limitMatrix.matrix.copy(limits);
            // limitMatrix.matrix.decompose(limitMatrix.position, limitMatrix.quaternion, limitMatrix.scale);
            // limitMatrix.updateMatrix();
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
               let binSizePos = computeAFrameBinSizePos(obj, relPos, padding, limits?.scale, limits?.position);
               // console.log(binSizePos)
               if (currentLayer === 0) {
                  binSizePos = rootSizePosToAFrame(binSizePos);
               } else {
                  binSizePos = changePos(binSizePos, padding);
               }
               //TODO ASI TREBA FlipLocalZAxis (zatial netreba ak je len 1D)

               const content = obj.getBinContent(relPos.x + 1, relPos.y + 1, relPos.z + 1);
               let scaleFactor = 1;
               if (layer === 0) {
                  scaleFactor = 0.2 + 0.8 * this.easeOutCubic(content / contentMax);
               } else {
                  scaleFactor = content / contentMax;
               }
               if (content === 0) {
                  scaleFactor = 0;
               }
               let t = content / contentMax;
               // this.color = new THREE.Color(t, 0, 1 - t);
               this.color = new THREE.Color(counter.getIndex() / 1000, 0, 1 - counter.getIndex() / 100);
               dummy.position.set(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)
               dummy.scale.set(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
               dummy.updateMatrix();

               this.matrixCache[currentLayer][i / stepFor] = {
                  position: new THREE.Vector3(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos),
                  scale: new THREE.Vector3(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size),
               }

               // t = binSizePos.y.size * scaleFactor;
               // if (isTH3) {
               //    binSizePos.x.size *= scaleFactor;
               //    binSizePos.z.size *= scaleFactor;
               // } else {
               //    binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
               //    binSizePos.z.size = 0.1;
               // }
               // binSizePos.y.size = t;

               dummy.position.set(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)
               dummy.scale.set(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
               dummy.updateMatrix();

               if (currentLayer === layer) {
                  this.instancedMesh.setMatrixAt(i, dummy.matrix);
                  this.instancedMesh.setColorAt(i, this.color);
               } else {
                  const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)
                  const child = obj.children[this.selectedChildren[currentLayer]][index];
                  // console.log(counter.getIndex())
                  render(i, i + stepFor, currentLayer + 1, child, this.matrixCache[currentLayer][counter.getIndex()]);
               }
               if (!counter.increment(0)) break;
            }
            this.instancedMesh.instanceMatrix.needsUpdate = true;
            this.instancedMesh.instanceColor.needsUpdate = true;

         }
         // const ex = {x: matrix.scale.x, y: matrix.scale.y, z: matrix.scale.z}
         // console.log(matrix)

         render(startIndex, endIndex, 0, this.rootObj, matrix);
         this.instancedMesh.computeBoundingBox();

         // console.log(k)


         // console.log(stepFor);

      },

      checkIntersection: function (ray) {
         const target = new THREE.Vector3();

         const createBox3 = (layer, index) => {
            const t = this.matrixCache[layer][index];
            return new THREE.Box3().setFromCenterAndSize(t.position, t.scale);
         };

         const checkAxis = (step, startIndex, endIndex, offset, layer) => {
            const half = Math.floor((startIndex + endIndex) / 2);
            const pointMin = createBox3(layer, (startIndex * step) + offset);
            const pointHalfBelow = createBox3(layer, (((half + 1) * step) - 1) + offset);
            const pointHalfUpper = createBox3(layer, ((half + 1) * step) + offset);
            const pointMax = createBox3(layer, (((endIndex + 1) * step) - 1) + offset);

            pointMin.applyMatrix4(this.instancedMesh.matrixWorld);
            pointHalfBelow.applyMatrix4(this.instancedMesh.matrixWorld);
            pointHalfUpper.applyMatrix4(this.instancedMesh.matrixWorld);
            pointMax.applyMatrix4(this.instancedMesh.matrixWorld);

            const boundaryFirstHalf = new THREE.Box3().copy(pointMin).union(pointHalfBelow);
            const boundarySecondHalf = new THREE.Box3().copy(pointHalfUpper).union(pointMax);

            const resultList = [];
            if (ray.intersectBox(boundaryFirstHalf, target)) {
               resultList.push([startIndex, half]);
            } else {
               resultList.push(null);
            }
            if (ray.intersectBox(boundarySecondHalf, target)) {
               resultList.push([half + 1, endIndex]);
            } else {
               resultList.push(null);
            }
            return resultList;
         };

         const dfs = (step, start, end, offset, layer) => {
            const output = [];
            const traverse = (start, end) => {
               if (start === end) {
                  output.push(start);
                  return;
               }
               const [firstHalf, secondHalf] = checkAxis(step, start, end, offset, layer);
               if (firstHalf) traverse(firstHalf[0], firstHalf[1]);
               if (secondHalf) traverse(secondHalf[0], secondHalf[1]);
            };
            traverse(start, end);
            if (output[output.length - 1] === end + 1) output.pop(); // edge fix
            return output;
         };

         const recursiveSearch = (node, layer, offset = 0, path = []) => {
            const fX = node.fXaxis.fNbins;
            const fY = node.fYaxis.fNbins;
            const fZ = node.fZaxis.fNbins;
            const perInstance = this.maxInstancesPerLayer[layer + 1];

            const stepZ = fX * fY;
            const stepY = stepZ / fY;
            const stepX = stepY / fX;

            const validZ = dfs(stepZ, 0, fZ - 1, offset, layer);
            const result = [];

            validZ.forEach(zIndex => {
               const offsetZ = offset + zIndex * stepZ;
               const validY = dfs(stepY, 0, fY - 1, offsetZ, layer);

               validY.forEach(yIndex => {
                  const offsetY = offsetZ + yIndex * stepY;
                  const validX = dfs(stepX, 0, fX - 1, offsetY, layer);

                  validX.forEach(xIndex => {
                     const fullPath = [...path, { x: xIndex, y: yIndex, z: zIndex }];
                     // Check for children and recurse
                     const binIndex = node.getBin(xIndex + 1, yIndex + 1, zIndex + 1);
                     const children = node.children?.[this.selectedChildren];
                     const child = children?.[binIndex];

                     if (child && child.fXaxis) {
                        const nextLayer = layer + 1;
                        const childOffset = (xIndex + (yIndex * fX) + (zIndex * (fX * fY))) * perInstance;
                        const childResults = recursiveSearch(child, nextLayer, childOffset, fullPath);
                        result.push(...childResults);
                     } else {
                        result.push(fullPath);
                     }
                  });
               });
            });

            return result;
         };

         return recursiveSearch(this.rootObj, 0);
      },

      //
      // checkIntersection: function (ray) {
      //    const layer = 0;
      //    const perInstance = this.maxInstancesPerLayer[layer + 1];
      //    const fXaxis = this.rootObj.fXaxis.fNbins;
      //    const fYaxis = this.rootObj.fYaxis.fNbins;
      //    const fZaxis = this.rootObj.fZaxis.fNbins;
      //    const dummyHalfUpper = new THREE.Object3D();
      //    const dummyHalfBelow = new THREE.Object3D();
      //    const dummyMin = new THREE.Object3D();
      //    const dummyMax = new THREE.Object3D();
      //
      //    const createBox3 = (layer, index) => {
      //       const t = this.matrixCache[layer][index];
      //       return new THREE.Box3().setFromCenterAndSize(t.position, t.scale)
      //    }
      //
      //    const checkAxis = (step, startIndex, endIndex, offset, layer) => {
      //       // console.log('layer: ', layer, ', start: ', startIndex, ', end: ', endIndex, ', offset: ', offset);
      //       const half = Math.floor((startIndex + endIndex) / 2);
      //       const pointMin = createBox3(layer, (startIndex * step) + offset);
      //       const pointHalfBelow = createBox3(layer, (((half + 1) * step) - 1) + offset);
      //       const pointHalfUpper = createBox3(layer, ((half + 1) * step) + offset);
      //       const pointMax = createBox3(layer, (((endIndex + 1) * step) - 1) + offset);
      //       pointMin.applyMatrix4(this.instancedMesh.matrixWorld);
      //       pointHalfBelow.applyMatrix4(this.instancedMesh.matrixWorld);
      //       pointHalfUpper.applyMatrix4(this.instancedMesh.matrixWorld);
      //       pointMax.applyMatrix4(this.instancedMesh.matrixWorld);
      //
      //       const boundaryFirstHalf = new THREE.Box3().copy(pointMin).union(pointHalfBelow)
      //       const boundarySecondHalf = new THREE.Box3().copy(pointHalfUpper).union(pointMax)
      //       const target = new THREE.Vector3();
      //       const resultList = [];
      //       // console.log(pointMin)
      //       // console.log(pointHalfBelow)
      //       // console.log(pointHalfUpper);
      //       // console.log(pointMax);
      //       // console.log(boundaryFirstHalf)
      //       // console.log(boundarySecondHalf)
      //       // console.log(ray.intersectBox(boundaryFirstHalf, target))
      //       // console.log(ray.intersectBox(boundarySecondHalf, target))
      //       if (ray.intersectBox(boundaryFirstHalf, target)) {
      //          resultList.push([startIndex, half]);
      //       } else {
      //          resultList.push(null);
      //       }
      //       if (ray.intersectBox(boundarySecondHalf, target)) {
      //          resultList.push([half + 1, endIndex]);
      //       } else {
      //          resultList.push(null);
      //       }
      //       return resultList;
      //    }
      //    let step = fXaxis * fYaxis;
      //
      //    const dfs = (step, start, end, offset, layer) => {
      //       const result = []
      //       const traverse = (start, end) => {
      //          if (start === end) {
      //             result.push(start);
      //             return;
      //          }
      //          const [firstHalf, secondHalf] = checkAxis(step, start, end, offset, layer);
      //          if (firstHalf) {
      //             traverse(firstHalf[0], firstHalf[1]);
      //          }
      //          if (secondHalf) {
      //             traverse(secondHalf[0], secondHalf[1]);
      //          }
      //       }
      //
      //       traverse(start, end);
      //       return result;
      //    }
      //
      //    const validZ = dfs(step, 0, this.rootObj.fZaxis.fNbins - 1, 0, layer);
      //    if (validZ[validZ.length - 1] === this.rootObj.fZaxis.fNbins) validZ.pop();
      //    const validY = validZ.reduce((acc, zIndex) => {
      //       const offset = zIndex * step;
      //       const res = dfs(step / fYaxis, 0, this.rootObj.fYaxis.fNbins - 1, offset, layer);
      //       if (res[res.length - 1] === this.rootObj.fYaxis.fNbins) res.pop();
      //       res.forEach(yIndex => {
      //          acc.push({z: zIndex, y: yIndex})
      //       });
      //       return acc;
      //    }, []);
      //
      //    let validX = validY.reduce((acc, index) => {
      //       const offset = (index.z * step) + (index.y * (step / fYaxis));
      //       const res = dfs(step / (fYaxis * fXaxis), 0, this.rootObj.fXaxis.fNbins - 1, offset, layer);
      //       if (res[res.length - 1] === this.rootObj.fXaxis.fNbins) res.pop();
      //       res.forEach(xIndex => {
      //          acc.push({x: xIndex, y: index.y, z: index.z})
      //       });
      //       return acc;
      //    }, []);
      //
      //    // console.log('before: ', validX);
      //
      //    // validX = validX.filter(pos => this.rootObj.getBinContent(pos.x + 1, pos.y + 1, pos.z + 1) !== 0)
      //
      //    // console.log('after: ', validX);
      //    validX.forEach(result => {
      //       // console.log(result)
      //       const child = this.rootObj.children[this.selectedChildren][this.rootObj.getBin(result.x+1, result.y+1, result.z+1)];
      //       // console.log(child)
      //       const fXaxis = child.fXaxis.fNbins;
      //       const fYaxis = child.fYaxis.fNbins;
      //       const step = fXaxis * fYaxis;
      //
      //       const validZ = dfs(step, 0, child.fZaxis.fNbins - 1, 0, 1);
      //       if (validZ[validZ.length - 1] === child.fZaxis.fNbins) validZ.pop();
      //
      //       const validY = validZ.reduce((acc, zIndex) => {
      //          const offset = zIndex * step;
      //          const res = dfs(step / fYaxis, 0, child.fYaxis.fNbins - 1, offset, 1);
      //          if (res[res.length - 1] === child.fYaxis.fNbins) res.pop();
      //          res.forEach(yIndex => {
      //             acc.push({z: zIndex, y: yIndex})
      //          });
      //          return acc;
      //       }, []);
      //
      //       let validX = validY.reduce((acc, index) => {
      //          const offset = (index.z * step) + (index.y * (step / fYaxis));
      //          console.log(step / (fYaxis * fXaxis))
      //          const res = dfs(step / (fYaxis * fXaxis), 0, child.fXaxis.fNbins - 1, offset, 1);
      //          if (res[res.length - 1] === child.fXaxis.fNbins) res.pop();
      //          res.forEach(xIndex => {
      //             acc.push({x: xIndex, y: index.y, z: index.z})
      //          });
      //          return acc;
      //       }, []);
      //       console.log(validX)
      //    })
      //
      //    return validX;
      // },

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