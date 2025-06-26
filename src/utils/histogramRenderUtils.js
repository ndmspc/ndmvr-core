/**
 *Instead of GetBinCoord, which is added to the JSRoot object only when rendered by JSRoot.
 *
 */
function GetBinUpperEdge(rootObjAxis, rootBinRelPosOnAxis) {
   if (rootBinRelPosOnAxis <= 0) return rootObjAxis.fXmin;
   if (rootBinRelPosOnAxis > rootObjAxis.fNbins) return rootObjAxis.fXmax;
   // console.log(`GetBinUpperEdge: ${rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis)} > ${rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis+1)}`);
   return (rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis + 1));
}


function getRootMinMaxBinSizeByAxis(rootObjAxis) {
   const minMaxBinSizeByAxis = {
      min: undefined,
      max: undefined
   }
   let binSize = 0;
   const varBinsNo = rootObjAxis.fXbins.length;
   if (varBinsNo > 1) { //variable binning with at least two bins
      minMaxBinSizeByAxis.min = rootObjAxis.fXbins[1] - rootObjAxis.fXbins[0];
      minMaxBinSizeByAxis.max = minMaxBinSizeByAxis.min;
      for (let i = 2; i < varBinsNo; i++) {
         binSize = rootObjAxis.fXbins[i] - rootObjAxis.fXbins[i - 1];
         minMaxBinSizeByAxis.min = Math.min(minMaxBinSizeByAxis.min, binSize);
         minMaxBinSizeByAxis.max = Math.max(minMaxBinSizeByAxis.max, binSize);
      }
   } else {//standard binning or variable binning with 1 bin
      minMaxBinSizeByAxis.min = (rootObjAxis.fXmax - rootObjAxis.fXmin) / rootObjAxis.fNbins;
      minMaxBinSizeByAxis.max = minMaxBinSizeByAxis.min;
   }
   return (minMaxBinSizeByAxis);
}

export function getRootMinMaxBinSizes(rootObj) {
   const rootMinMaxBinSizes = {
      x: undefined,
      y: undefined,
      z: undefined
   }
   if (rootObj.fXaxis) {
      rootMinMaxBinSizes.x = getRootMinMaxBinSizeByAxis(rootObj.fXaxis);
   }
   if (rootObj.fYaxis) {
      rootMinMaxBinSizes.y = getRootMinMaxBinSizeByAxis(rootObj.fYaxis);
   }
   if (rootObj.fZaxis) {
      rootMinMaxBinSizes.z = getRootMinMaxBinSizeByAxis(rootObj.fZaxis);
   }
   return rootMinMaxBinSizes;
}

export function changePos(rootBinRel, padding) {
   rootBinRel.pos -= size / 2;
   rootBinRel.pos += rootBinRel.size;
   rootBinRel.pos += padding / (wholeSize / size)
   // rootBinRel.z.pos -= rootBinRel.z.size;
   // rootBinRel.y.pos += rootBinRel.y.size;
   // rootBinRel.y.pos += padding.y * 0.268815;
   // rootBinRel.z.pos += padding.z * 0.0999999;
   // rootBinRel.x.pos -= padding.x * 0.304;

   return rootBinRel;
}

/**
 * Get bin's size and position relative to histogram axis.
 * @param rootObjAxis defines on which axis position and size is returned.
 * @param rootBinRelPosOnAxis index of bin on axis.
 * @param size defines size of dimension on axis.
 * @param padding defines padding on axis.
 * */
function getRootBinSizePosByAxis(rootObjAxis, rootBinRelPosOnAxis, size, padding, offset, layer) {
   const rootBinSizePosByAxis = {
      size: undefined,
      pos: undefined
   }
   const binLowEdge = rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis);
   const binUpperEdge = GetBinUpperEdge(rootObjAxis, rootBinRelPosOnAxis);
   const binSizeByAxis = Math.abs(binUpperEdge - binLowEdge);

   rootBinSizePosByAxis.size = binSizeByAxis;


   //bin low edge + half of width * scale relative to size of whole histogram
   rootBinSizePosByAxis.pos = binLowEdge + (binSizeByAxis / 2);

   const wholeSize = ((rootObjAxis.fXmax - rootObjAxis.fXmin) + (padding * (rootObjAxis.fNbins - 1)));
   // if (layer === 1 && rootObjAxis.fName === 'xaxis') {
      // console.log(size)
      // console.log(rootBinSizePosByAxis.size)
      // console.log( 1 / (wholeSize / size))
   // }
   if (size) {
      rootBinSizePosByAxis.pos += padding * (rootBinRelPosOnAxis - 1);
      rootBinSizePosByAxis.pos /= (wholeSize / size);
      rootBinSizePosByAxis.size /= (wholeSize / size);

      rootBinSizePosByAxis.pos -= size / 2;
      rootBinSizePosByAxis.pos += rootBinSizePosByAxis.size;
      rootBinSizePosByAxis.pos += padding / (wholeSize / size)

      // if (rootObjAxis.fName === 'zaxis') {
      //    rootBinSizePosByAxis.pos -= size / 2;
      //    rootBinSizePosByAxis.pos += rootBinSizePosByAxis.size;
      //    rootBinSizePosByAxis.pos += padding / (wholeSize / size)
      // } else if (rootObjAxis.fName === 'yaxis') {
      //    rootBinSizePosByAxis.pos -= size / 2;
      //    rootBinSizePosByAxis.pos += rootBinSizePosByAxis.size;
      //    rootBinSizePosByAxis.pos += padding / (wholeSize / size)
      // } else if (rootObjAxis.fName === 'xaxis') {
      //    rootBinSizePosByAxis.pos -= size / 2;
      //    rootBinSizePosByAxis.pos += rootBinSizePosByAxis.size;
      //    rootBinSizePosByAxis.pos += padding / (wholeSize / size)
      // }
      // if (layer === 1 && rootObjAxis.fName === 'xaxis') {
      //    rootBinSizePosByAxis.pos -= 2.5
      // }

      rootBinSizePosByAxis.pos += offset;
   }

   if (rootObjAxis.fXmin < 0) {
      if (size) {
         const off = (0 - rootObjAxis.fXmin);
         rootBinSizePosByAxis.pos += off / (wholeSize / size)
      } else {
         rootBinSizePosByAxis.pos += (0 - rootObjAxis.fXmin);
      }
   }

   return (rootBinSizePosByAxis);
}

/**
 * Get bin's size and position relative to histogram axis.
 * */
function getRootBinSizePos(rootObj, rootBinRelPos, size, padding, offset, layer) {
   const rootBinSizePos = {
      x: undefined,
      y: undefined,
      z: undefined
   }
   if (rootObj.fXaxis) {
      rootBinSizePos.x = getRootBinSizePosByAxis(rootObj.fXaxis, rootBinRelPos.x, size?.x, padding?.x, offset?.x, layer);
   }
   if (rootObj.fYaxis) {
      rootBinSizePos.y = getRootBinSizePosByAxis(rootObj.fYaxis, rootBinRelPos.y, size?.y, padding?.y, offset?.y, layer);
   }
   if (rootObj.fZaxis) {
      rootBinSizePos.z = getRootBinSizePosByAxis(rootObj.fZaxis, rootBinRelPos.z, size?.z, padding?.z, offset?.z, layer);
   }

   // return rootSizePosToAFrame(rootBinSizePos);
   return rootBinSizePos;

}

export function rootSizePosToAFrame(jsrootSizePos) {
   const aframeSizePos = {
      x: undefined,
      y: undefined,
      z: undefined
   }
   //x is left unchanged
   if (jsrootSizePos.x) {
      aframeSizePos.x = {
         size: jsrootSizePos.x.size,
         pos: jsrootSizePos.x.pos
      };
   }
   //z becomes y
   if (jsrootSizePos.z) {
      aframeSizePos.y = {
         size: jsrootSizePos.z.size,
         pos: jsrootSizePos.z.pos
      };
   }
   //-y becomes z
   if (jsrootSizePos.y) {
      aframeSizePos.z = {
         size: jsrootSizePos.y.size,
         pos: -jsrootSizePos.y.pos
      };
   }
   return (aframeSizePos);
}

export function limitMatrixInit(rootObj, layer) {
   const limitMatrix = new THREE.Object3D();
   const axisIndex = (layer * 3);
   const limitInit = {
      x: undefined,
      y: undefined,
      z: undefined
   }
   if (rootObj[axisIndex]) {
      limitInit.x = rootObj[axisIndex].value.fXaxis.fXmax - rootObj[axisIndex].value.fXaxis.fXmax;
      limitInit.y = rootObj[axisIndex].value.fYaxis.fXmax - rootObj[axisIndex].value.fYaxis.fXmax;
      limitInit.z = rootObj[axisIndex].value.fZaxis.fXmax - rootObj[axisIndex].value.fZaxis.fXmax;
   }
   if (rootObj[axisIndex + 1]) {
      limitInit.y = rootObj[axisIndex + 1].value.fYaxis.fXmax - rootObj[axisIndex + 1].value.fYaxis.fXmax;
   }
   if (rootObj[axisIndex + 2]) {
      limitInit.z = rootObj[axisIndex + 2].value.fZaxis.fXmax - rootObj[axisIndex + 2].value.fZaxis.fXmax;
   }
   limitMatrix.scale.set(limitInit.x, limitInit.y, limitInit.z);

   return limitMatrix;
}


/**
 * This version assumes that
 * - bins start at 0 in all axes
 * - 1 is the smallest bin dimension in all axes
 */
export function computeAFrameBinSizePos(rootObj, rootBinRelPos, padding, size, offset, layer) {

   const absRootBinSizePos = getRootBinSizePos(rootObj, rootBinRelPos, size, padding, offset, layer);

   if (!size) {
      for (let axis in absRootBinSizePos) {
         absRootBinSizePos[axis].pos = absRootBinSizePos[axis].pos + padding[axis] * (rootBinRelPos[axis] - 1);
         // console.log(axis, absRootBinSizePos[axis], padding[axis], rootBinRelPos[axis]);
      }
   }

   //TODO: resolve TH1 and TH2 (height = content); for TH3 height = scale

   // return rootSizePosToAFrame(absRootBinSizePos);
   return absRootBinSizePos;
}

/**
 * Flips target Z position by limitMatrix.
 * Origin of rotation is at center of limitMatrix.
 * */
export function flipLocalZAxis(limitMatrix, target) {
   const posZ = limitMatrix.position.z;
   const scaleZ = limitMatrix.scale.z;
   const minZ = Math.min(posZ, posZ + scaleZ);
   return 2 * minZ - target;
}

export function stringToXYZ(str) {
   const [x, y, z] = str.split(' ').map(Number);
   return {x, y, z};
}


