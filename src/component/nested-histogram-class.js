import RadixCounter from "../utils/radixCounter.js";
import {computeAFrameBinSizePos, rootSizePosToAFrame} from "../utils/histogramRenderUtils.js";

export default class NestedHistogram {
   bin_padding_x;
   bin_padding_y;
   bin_padding_z;

   rootObj = undefined;
   instancedMesh = undefined;
   raycaster = undefined;
   histoSub = undefined;
   sub = undefined;
   maxInstancesPerLayer = undefined;
   totalInstances = undefined;
   color = new THREE.Color();
   matrixCache = undefined;
   selectedChildren = ['unlikepm'];
   clickEvents = [];
   mousemoveEvents = [];

   constructor(bin_padding_x, bin_padding_y, bin_padding_z) {
      this.bin_padding_x = bin_padding_x;
      this.bin_padding_y = bin_padding_y;
      this.bin_padding_z = bin_padding_z;
      this.raycaster = new THREE.Raycaster();
   }

   init(histo) {
      this.rootObj = histo.histogram;
      this.maxInstancesPerLayer = this.computeMaxInstancesPerLayer();
      // console.log(this.maxInstancesPerLayer)
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

      this.instancedMesh.raycast = (raycaster, intersects) => {
         const res = this.checkIntersection(raycaster.ray);
         // }
         if (res) {
            const trigger = raycaster._triggerSource;
            if (trigger === 'mousemove') {
               // this.showChildHistogram()
               this.mousemoveEvents.forEach(func => {
                  // console.log(res[0].index)
                  // func(res[0].index);
               });
            } else if (trigger === 'mouseclick') {
               this.clickEvents.forEach(func => {
                  console.log(res[0].index)
                  // func(res[0].index);
               });
            }
            // console.log(res[0])
         }
      }
      console.log(this.rootObj)
      console.log(this.matrixCache)
   }

   addEvent(event, func) {
      console.log(event)
      const boundFunction = func.bind(this);
      if (event === 'mouseclick') {
         this.clickEvents.push(boundFunction);
      } else if(event === 'mousemove') {
         console.log('pushed to array')
         this.mousemoveEvents.push(boundFunction);
      }
   }

   renderHistogram(startIndex, endIndex, layer) {
      if (!this.rootObj ||
         layer > this.maxInstancesPerLayer.length - 1) return;
      this.currentLayer = layer;

      const matrix = {
         position: new THREE.Vector3(0, 0, 0),
         scale: new THREE.Vector3(10, 5, 10)
      };

      const dummy = new THREE.Object3D();

      const render = (startIndex, endIndex, currentLayer, obj, limits) => {
         // if (currentLayer === 1 && startIndex === 0) {
         //    console.log('start: ', startIndex, ', end: ', endIndex, ', limits: ', limits);
         // }
         if (currentLayer > layer) return;
         if (!obj) return;
         const fXbins = obj.fXaxis.fNbins;
         const fYbins = obj.fYaxis.fNbins;
         const fZbins = obj.fZaxis.fNbins;

         const counter = new RadixCounter([fXbins, fYbins, fZbins]);
         const contentMax = Math.max(...this.filterOutsideContent(obj));
         const isTH3 = obj._typename.substring(0, 3) === 'TH3';
         const isTH2 = obj._typename.substring(0, 3) === 'TH2';
         const stepFor = this.maxInstancesPerLayer
            .slice(currentLayer + 1)
            .reduce((acc, value) => {
               return acc * value;
            }, 1);
         counter.setFromNumber(startIndex / stepFor)

         let padding;
         if (isTH3) {
            padding = {
               x: this.bin_padding_x,
               y: this.bin_padding_y,
               z: this.bin_padding_z,
            };
         } else {
            padding = {
               x: 0,
               y: this.bin_padding_y,
               // y: 0,
               z: this.bin_padding_z,
            }
         }

         for (let i = startIndex; i < endIndex; i += stepFor) {
            const relPos = {x: counter.getValueAt(0), y: counter.getValueAt(1), z: counter.getValueAt(2)}
            let binSizePos = computeAFrameBinSizePos(obj, relPos, padding, limits?.scale, limits?.position, currentLayer);

            if (currentLayer === 0) {
               binSizePos = rootSizePosToAFrame(binSizePos);
            } else {
               binSizePos = rootSizePosToAFrame(binSizePos);
               binSizePos.z.pos = -binSizePos.z.pos;
            }

            //TODO ASI TREBA FlipLocalZAxis (zatial netreba ak je len 1D)

            const content = obj.getBinContent(relPos.x + 1, relPos.y + 1, relPos.z + 1);
            let scaleFactor = 1;
            if (currentLayer === 0) {
               scaleFactor = 0.2 + 0.8 * this.easeOutCubic(content / contentMax);
            } else {
               scaleFactor = content / contentMax;
            }
            if (content === 0) {
               scaleFactor = 0;
            }
            let t = content / contentMax;
            this.color = new THREE.Color(t, 0, 1 - t);
            // this.color = new THREE.Color(1, 0, 0);
            // this.color = new THREE.Color(counter.getIndex() / 1000, 0, 1 - counter.getIndex() / 10);

            // if (currentLayer === 0) {
            //    // console.log(i / stepFor)
            //    const color = new THREE.Color(255, 0, 0);
            //    const box = new THREE.Box3().setFromCenterAndSize(
            //       new THREE.Vector3(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos),
            //       new THREE.Vector3(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
            //    );
            //    const helper = new THREE.Box3Helper(box, color);
            //    helper.raycast = () => {
            //    };
            //
            //    const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)
            //    const child = obj.children[this.selectedChildren[currentLayer]][index];
            //    if (child) {
            //       this.el.object3D.add(helper);
            //    }
            // }

            // if (isTH2) {
            //    binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
            // } else if (!isTH3) {
            //    binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
            //    binSizePos.z.size = 0.01;
            // }


            // if (layer === 0) {
            this.matrixCache[currentLayer][i / stepFor] = {
               position: new THREE.Vector3(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos),
               scale: new THREE.Vector3(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size),
            }
            // }

            // if (layer === 1 && currentLayer === 0) {
               // console.log(this.matrixCache[0][0].position)
            // }
            // console.log(i, binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)

            t = binSizePos.y.size * scaleFactor;

            if (isTH3) {
               binSizePos.x.size *= scaleFactor;
               binSizePos.z.size *= scaleFactor;
            } else if (isTH2) {
               binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
            } else {
               binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
               binSizePos.z.size = 0.1;
            }
            binSizePos.y.size = t;

            dummy.position.set(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)
            dummy.scale.set(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
            dummy.updateMatrix();

            if (currentLayer === layer) {
               this.instancedMesh.setMatrixAt(i, dummy.matrix);
               this.instancedMesh.setColorAt(i, this.color);
               // this.matrixCache[currentLayer][i / stepFor] = {
               //    position: new THREE.Vector3(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos),
               //    scale: new THREE.Vector3(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size),
               // }
            } else {
               const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)
               const child = obj.children[this.selectedChildren[currentLayer]][index];
               // console.log(i, i+stepFor, currentLayer + 1, child, this.matrixCache[currentLayer][i/stepFor])
               render(i, i + stepFor, currentLayer + 1, child, this.matrixCache[currentLayer][i / stepFor]);
            }
            if (!counter.increment(0)) break;
         }
         this.instancedMesh.instanceMatrix.needsUpdate = true;
         this.instancedMesh.instanceColor.needsUpdate = true;

      }

      render(startIndex, endIndex, 0, this.rootObj, matrix);
      this.instancedMesh.computeBoundingBox();
   }


   showChildHistogram(index) {

      // console.log(this.rootObj.getBin(index[0].x + 1, index[0].y + 1, index[0].z + 1))
      let ind = 0;
      const rec = (layer, obj) => {
         const fX = obj.fXaxis.fNbins;
         const fY = obj.fYaxis.fNbins;
         const fZ = obj.fZaxis.fNbins;
         ind += (index[layer].x + (index[layer].y * fX) + (index[layer].z * fX * fY)) * this.maxInstancesPerLayer[layer + 1]
         // ind += (fX + (fY * fX) + (fZ * fX * fY)) * this.maxInstancesPerLayer[layer + 1]
         if (layer + 1 < index.length) {
            rec(layer + 1,
               obj.children[this.selectedChildren[0]]
                  [obj.getBin(index[layer].x + 1, index[layer].y + 1, index[layer].z + 1)])
         }
      }
      rec(0, this.rootObj);
      // console.log(this.matrixCache[0][0])
      // console.log(this.matrixCache[0][1])
      // console.log(index, ind, ind +  this.maxInstancesPerLayer[index.length],index.length)
      this.renderHistogram(ind, ind + this.maxInstancesPerLayer[index.length], index.length)
   }

   checkIntersection(ray) {
      const target = new THREE.Vector3();

      const createBox3 = (layer, index) => {
         const t = this.matrixCache[layer][index];
         // console.log('layer: ', layer, ', index: ', index, ', t: ', t);
         if (t) {
            return new THREE.Box3().setFromCenterAndSize(t.position, t.scale);
         }
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

         // if (layer === 1) {      DEBUG
         //    const helper = new THREE.Box3Helper(boundaryFirstHalf, new THREE.Color(0, 1, 0));
         //    helper.raycast = () => {};
         //    this.el.object3D.add(helper);
         // }

         const resultList = [];
         if (ray.intersectBox(boundaryFirstHalf, target)) {
            resultList.push({array: [startIndex, half], target: target, distance: ray.origin.distanceTo(target)})
         } else {
            resultList.push(null);
         }
         if (ray.intersectBox(boundarySecondHalf, target)) {
            resultList.push({array: [half + 1, endIndex], target: target, distance: ray.origin.distanceTo(target)})
         } else {
            resultList.push(null);
         }
         return resultList;
      };

      const dfs = (step, start, end, offset, layer) => {

         const output = [];
         const traverse = (details) => {
            if (details.array[0] === details.array[1]) {
               output.push(details);
               return;
            }
            const [firstHalf, secondHalf] = checkAxis(step, details.array[0], details.array[1], offset, layer);
            if (firstHalf) traverse(firstHalf);
            if (secondHalf) traverse(secondHalf);
         };
         traverse({array: [start, end], target: null, distance: null});
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

         validZ.forEach(z => {
            const zIndex = z.array[0];
            const offsetZ = offset + zIndex * stepZ;
            const validY = dfs(stepY, 0, fY - 1, offsetZ, layer);

            validY.forEach(y => {
               const yIndex = y.array[0];
               const offsetY = offsetZ + yIndex * stepY;

               const validX = dfs(stepX, 0, fX - 1, offsetY, layer);

               validX.forEach(x => {
                  const xIndex = x.array[0];
                  const fullPath = [...path, {x: xIndex, y: yIndex, z: zIndex}];
                  const binIndex = node.getBin(xIndex + 1, yIndex + 1, zIndex + 1);
                  const children = node.children?.[this.selectedChildren];
                  const child = children?.[binIndex];

                  // const dummy = new THREE.Object3D();
                  // this.instancedMesh.getMatrixAt(
                  //    ((xIndex + (yIndex * fX) + (zIndex * fX * fY)) * perInstance) + this.maxInstancesPerLayer[layer+2],
                  //    dummy.matrix);
                  // dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                  // console.log('decompose')
                  const childOffset = (xIndex + (yIndex * fX) + (zIndex * (fX * fY))) * perInstance;

                  const next = this.matrixCache[layer + 1][childOffset + this.maxInstancesPerLayer[layer + 2]]

                  if (child && child.children && next) {
                     const nextLayer = layer + 1;
                     const childResults = recursiveSearch(child, nextLayer, childOffset, fullPath);
                     result.push(...childResults);
                  } else {
                     result.push({index: fullPath, target: x.target, distance: x.distance});
                  }
               });
            });
         });

         return result.sort((a, b) => {
            return a.distance - b.distance
         });
      };

      return recursiveSearch(this.rootObj, 0);
   }

   filterOutsideContent(rootObj) {
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
   }

   easeOutQuad(t) {
      return 1 - (1 - t) * (1 - t);
   }

   easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
   }

   computeMaxInstancesPerLayer() {
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
      max.push(1)
      return max;
   }

   remove() {
      this.histoSub.unsubscribe();
      this.sub.unsubscribe();
      // this.instancedMesh.dispose();
      this.matrixCache = [];
   }
}