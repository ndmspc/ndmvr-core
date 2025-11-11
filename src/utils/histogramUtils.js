import RadixCounter from "./radixCounter.js";

/**
 *Instead of GetBinCoord, which is added to the JSRoot object only when rendered by JSRoot.
 *
 */
function GetBinUpperEdge (axis, bin) {
  if (bin <= 0) return axis.fXmin;
  if (bin > axis.fNbins) return axis.fXmax;
  return axis.GetBinLowEdge(bin + 1);
}

/**
 * Get bin's size and position relative to histogram axis.
 * @param rootObjAxis defines on which axis position and size is returned.
 * @param rootBinRelPosOnAxis index of bin on axis.
 * @param size defines size of dimension on axis.
 * @param padding defines padding on axis.
 * */
function getRootBinSizePosByAxis (axis, binRelPos, size, padding, offset, layer, target) {
  const bin = binRelPos + 1;
  const binLow = axis.GetBinLowEdge(bin);
  const binUpper = GetBinUpperEdge(axis, bin);
  const binSize = Math.abs(binUpper - binLow);

  target.size = binSize;
  target.pos = binLow + (binSize * 0.5) - axis.fXmin;

  if (size) {
    const wholeSize = axis.fXmax - axis.fXmin;
    const sizeWoPadding = size - padding * (axis.fNbins - 1);
    const scale = wholeSize / sizeWoPadding;

    target.pos /= scale;
    target.size /= scale;
    target.pos -= size * 0.5;
    target.pos += offset;
  }
  target.pos += padding * binRelPos;
}

/**
 * Get bin's size and position relative to histogram axis.
 * */
function getRootBinSizePos (rootObj, rootBinRelPos, size, padding, offset, layer, target) {
  getRootBinSizePosByAxis(rootObj.fXaxis, rootBinRelPos.x, size?.x, padding?.x, offset?.x, layer, target.x);
  getRootBinSizePosByAxis(rootObj.fYaxis, rootBinRelPos.y, size?.z, padding?.y, offset?.z, layer, target.y);
  getRootBinSizePosByAxis(rootObj.fZaxis, rootBinRelPos.z, size?.y, padding?.z, offset?.y, layer, target.z);
}

export function rootSizePosToAFrame (jsrootSizePos) {
  const sizeY = jsrootSizePos.y.size;
  const posY = jsrootSizePos.y.pos;

  jsrootSizePos.y.size = jsrootSizePos.z.size;
  jsrootSizePos.y.pos = jsrootSizePos.z.pos;
  jsrootSizePos.z.size = sizeY;
  jsrootSizePos.z.pos = posY;

  return jsrootSizePos;
}

/**
 * This version assumes that
 * - bins start at 0 in all axes
 * - 1 is the smallest bin dimension in all axes
 */
export function computeAFrameBinSizePos (rootObj, rootBinRelPos, padding, size, offset, layer, target) {
  getRootBinSizePos(rootObj, rootBinRelPos, size, padding, offset, layer, target);

  if (!size) {
    target.x.pos += padding.x * (rootBinRelPos.x - 1);
    target.y.pos += padding.y * (rootBinRelPos.y - 1);
    target.z.pos += padding.z * (rootBinRelPos.z - 1);
  }

  return target;
}

/**
 * Flips target Z position by limitMatrix.
 * Origin of rotation is at center of limitMatrix.
 * */
export function flipLocalZAxis (worldPosition, worldScale, localPosition) {
  localPosition.z.pos = 2 * worldPosition - localPosition.z.pos;
  return localPosition;
  // return {
  //   ...localPosition,
  //   z: {
  //     size: localPosition.z.size,
  //     pos: 2 * worldPosition - localPosition.z.pos,
  //   },
  // };
}

export function areArraysEqual (arr1, arr2) {
  if (arr1.length !== arr2.length) return false;

  const countMap = {};
  for (const str of arr1) {
    countMap[str] = (countMap[str] || 0) + 1;
  }

  for (const str of arr2) {
    if (!countMap[str]) {
      return false;
    }
    countMap[str]--;
  }

  return true;
}

export function easeOutQuad (t) {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic (t) {
  return 1 - Math.pow(1 - t, 3);
}

export function stringToXYZ (str) {
  const [x, y, z] = str.split(" ").map(Number);
  return { x, y, z };
}

/**
 * @desc Computes linear index of bin by position.
 * @param position should be array with position for each layer.
 * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
 * @return Array in which entries represents linear index of bins for each index.
 * If used with combination from position obtained by ray-cast event,
 * the last entry is always index of visible bin.
 * */
export function computeIndexFromPosition (position, obj, maxInstancesPerLayer, selectedSet) {
  let ind = Array(position.length).fill(0);
  const rec = (layer, obj, index) => {
    const fX = obj.fXaxis.fNbins;
    const fY = obj.fYaxis.fNbins;
    const fZ = obj.fZaxis.fNbins;
    const t = maxInstancesPerLayer.slice(
      -maxInstancesPerLayer.length + layer + 1,
    );
    // console.log(t)
    const multiplier = t.reduce((acc, value) => {
      return acc * value;
    }, 1);
    // console.log(multiplier)
    ind[index] +=
      (position[layer].x +
        position[layer].y * fX +
        position[layer].z * fX * fY) *
      multiplier;
    if (layer + 1 < position.length) {
      let child = undefined;
      if (obj.children.content) {
        child =
          obj.children.content[
            obj.getBin(
              position[layer].x + 1,
              position[layer].y + 1,
              position[layer].z + 1,
            )
            ];
      } else {
        child =
          obj.children[selectedSet[0]][
            obj.getBin(
              position[layer].x + 1,
              position[layer].y + 1,
              position[layer].z + 1,
            )
            ];
      }
      if (index > layer) {
        rec(layer + 1, child, index);
      }
    }
  };
  for (let i = 0; i < position.length; i++) {
    rec(0, obj, i);
  }

  return ind;
}

/**
 * @desc Computes jsroot (Root specification) index of bin by position.
 * @param position should be array with position for each layer.
 * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
 * @return Array in which entries represents jsroot index of bins for each index.
 * If used with combination from position obtained by ray-cast event,
 * the last entry is always index of visible bin.
 * */
export function computeJsRootIndexFromPosition (position, obj, selectedSet) {
  let ind = Array(position.length).fill(0);
  for (let i = 0; i < position.length; i++) {
    ind[i] = obj.getBin(
      position[i].x + 1,
      position[i].y + 1,
      position[i].z + 1,
    );
    if (obj.children) {
      if (obj.children?.content) {
        obj = obj.children.content[ind[i]];
      } else {
        obj = obj.children[selectedSet[0]][ind[i]];
      }
    } else {
      return ind;
    }
  }
  return ind;
}

/**
 * Method to obtain range of axes from each layer.
 * @param position – should be array with position for each layer.
 * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
 * @param obj Jsroot object from which histogram is computed range of bin.
 * @default Pointers origin.
 * */
export function getRangeByPosition (position, set, obj, wireframe, selectedSet, layer = 0) {
  const axisNames = ["x", "y", "z"];
  const nAxes = Number.parseInt(obj._typename.substring(2, 3), 10);

  let range = {};

  if (position[0]) {
    for (let i = 0; i < nAxes; i++) {
      const axisKey = axisNames[i]; // "x", "y", or "z"
      const axisObj = obj[`f${axisKey.toUpperCase()}axis`]; // fXaxis, fYaxis, fZaxis
      const posVal = position[0][axisKey];

      range[axisKey] = {
        min: axisObj.GetBinLowEdge(posVal + 1),
        max: axisObj.GetBinCenter(posVal + 1) * 2 - axisObj.GetBinLowEdge(posVal + 1),
        name: axisObj.fName,
        title: axisObj.fTitle,
        label: axisObj.fLabels?.arr[posVal]?.fString
      };
    }
    range = { ...range, color: wireframe.getColorAt(layer, set), name: obj.fName };
  }
  if (position[1]) {
    let child = undefined;
    if (obj.children?.content) {
      child =
        obj.children.content[
          obj.getBin(position[0].x + 1, position[0].y + 1, position[0].z + 1)
          ];
    } else if (obj.children?.[selectedSet[0]]) {
      child =
        obj.children[selectedSet[0]][
          obj.getBin(position[0].x + 1, position[0].y + 1, position[0].z + 1)
          ];
    }
    return [range, ...getRangeByPosition(position.slice(1), set, child, wireframe, selectedSet, layer + 1)];
  } else {
    return [range];
  }
}

/**
 * @desc Calculates linear index of bin that starts the histogram specified by position.
 * @param position – should be array with position for each layer.
 * e.g. ([{x: 1, y: 3, z: 2}, {x: 89, 0, 0}])
 * @return Linear index of starting bin of the histogram specified by position.
 * * */
export function calculateHierarchicalIndex (position, obj, maxInstancesPerLayer, selectedSet) {
  let calculatedIndex = 0;
  const layerSizes = maxInstancesPerLayer.slice(1);
  const multipliers = [];

  for (let i = 0; i < layerSizes.length; i++) {
    const multiplier = layerSizes
      .slice(i)
      .reduce((acc, value) => acc * value, 1);
    multipliers.push(multiplier);
  }

  const traverse = (layer, obj) => {
    const { fNbins: fX } = obj.fXaxis;
    const { fNbins: fY } = obj.fYaxis;
    const { fNbins: fZ } = obj.fZaxis;

    const linearIndex =
      position[layer].x +
      position[layer].y * fX +
      position[layer].z * fX * fY;

    calculatedIndex += linearIndex * multipliers[layer];

    if (layer + 1 < position.length) {
      const child = getChildObject(obj, position[layer], selectedSet);
      traverse(layer + 1, child);
    }
  };

  traverse(0, obj);
  return calculatedIndex;
}

/**
 * @desc Getter function for child in jsroot histogram object.
 * @param obj Jsroot histogram object
 * @param positionLayer - JS object with position for each axis.
 * e.g. ({x: 0, y: 2, z: 1})
 * @return Jsroot histogram object of children specified by indexLayer from obj.
 * */
function getChildObject (obj, positionLayer, selectedSet) {
  const binIndex = obj.getBin(
    positionLayer.x + 1,
    positionLayer.y + 1,
    positionLayer.z + 1,
  );

  if (obj.children.content) {
    return obj.children.content[binIndex];
  } else {
    return obj.children[selectedSet[0]][binIndex];
  }
}

/**
 * @desc Computes max numeric content for each layer and each set if available.
 * @return Array of content or set objects containing max value.
 * */
export function computeMaxContentPerLayer (obj) {
  if (!obj) return;

  // looping is faster than Math.max or reduce
  const getMax = (arr) => {
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v > max) max = v;
    }
    return max;
  };

  const max = [];

  max[0] = { content: getMax(obj.fArray) };

  if (obj.fArrays) {
    Object.keys(obj?.fArrays).forEach((array) => {
      max[0] = {
        ...max[0],
        [array]: getMax(obj.fArrays[array]),
      };
    });
  }

  const computation = (children, layer = 1) => {
    if (!max[layer]) {
      max[layer] = {};
    }

    Object.entries(children).forEach(([key, childArray]) => {
      childArray.forEach((child) => {
        if (!child) return;

        const temp = getMax(child.fArray);

        if (!(key in max[layer]) || temp > max[layer][key]) {
          max[layer][key] = temp;
        }

        if (child.children) {
          computation(child.children, layer + 1);
        }
      });
    });
  };

  if (obj.children) {
    computation(obj.children);
  }

  return max;
}

/**
 * @desc Computes max numeric content for each layer and each set if available.
 * @return Array of content or set objects containing max value.
 * */
export function computeMinContentPerLayer (obj) {
  if (!obj) return;

  // looping is faster than Math.max or reduce
  const getMin = (arr) => {
    let min = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v < min) min = v;
    }
    return min;
  };

  const min = [];

  min[0] = {
    content: getMin(obj.fArray.filter((v) => v !== 0)),
  };

  if (obj.fArrays) {
    Object.keys(obj?.fArrays).forEach((array) => {
      min[0] = {
        ...min[0],
        [array]: getMin(
          obj.fArrays[array].values.filter((v) => v !== 0),
        ),
      };
    });
  }

  const computation = (children, layer = 1) => {
    if (!min[layer]) {
      min[layer] = {};
    }

    Object.entries(children).forEach(([key, childArray]) => {
      childArray.forEach((child) => {
        if (!child) return;

        const temp = getMin(child.fArray.filter((v) => v !== 0));

        if (!(key in min[layer]) || temp > min[layer][key]) {
          min[layer][key] = temp;
        }

        if (child.children) {
          computation(child.children, layer + 1);
        }
      });
    });
  };

  if (obj.children) {
    computation(obj.children);
  }

  return min;
}

/**
 * @desc Computes Maximum number of instances for each layer of histogram.
 * @return Array of numbers representing max value for each layer.
 * */
export function computeMaxInstancesPerLayer (obj) {
  if (!obj) return;
  const temp =
    obj.fXaxis.fNbins *
    obj.fYaxis.fNbins *
    obj.fZaxis.fNbins;
  let max = [];
  max.push(temp);

  const computation = (children, layer = 1) => {
    let temp = 0;
    if (layer >= max.length) {
      max.push(0);
    }
    Object.entries(children).forEach((value, index) => {
      value[1].forEach((child) => {
        // console.log(child)
        if (child) {
          temp =
            child.fXaxis.fNbins * child.fYaxis.fNbins * child.fZaxis.fNbins;
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
  if (obj.children) {
    computation(obj.children);
  }
  max.push(1);
  return max;
}

export function fillColorArray (config, material, colorArray) {
  new THREE.Color(config.color.default.min).toArray(colorArray, 0);
  new THREE.Color(config.color.default.max).toArray(colorArray, 3);

  let currentIndex = 1;

  config.color.layer.forEach((color) => {
    const baseIdx = currentIndex * 6;
    new THREE.Color(color.min).toArray(colorArray, baseIdx);
    new THREE.Color(color.max).toArray(colorArray, baseIdx + 3);
    currentIndex++;
  });

  config.color.set.forEach((color) => {
    const baseIdx = currentIndex * 6;
    new THREE.Color(color.min).toArray(colorArray, baseIdx);
    new THREE.Color(color.max).toArray(colorArray, baseIdx + 3);
    currentIndex++;
  });

  material.uniforms.colorPairs = { value: colorArray };
  material.uniformsNeedUpdate = true;
}

export function getGradientColorInst (colorConfig, availableSets, value, min, max, availableSetIndex, layer) {
  const normalize = (value, min, max) => (value - min) / (max - min);
  const t = normalize(value, min, max);

  let colorPairIndex = 0;

  if (colorConfig.set[availableSetIndex]) {
    const layerCount = colorConfig.layer.length;
    colorPairIndex = 1 + layerCount + availableSetIndex;
  } else if (colorConfig.layer[layer]) {
    colorPairIndex = 1 + layer;
  }
  return colorPairIndex + t;
}

export function getGradientColor (colorConfig, availableSets, value, min, max, set, layer) {
  const normalize = (value, min, max) => (value - min) / (max - min);
  const t = normalize(value, min, max);

  const setIndex = availableSets.indexOf(set);

  if (colorConfig.set[setIndex]) {
    const minColor = colorConfig.set[setIndex].min;
    return minColor.clone().lerp(colorConfig.set[setIndex].max, t);
  } else if (colorConfig.layer[layer]) {
    const minColor = colorConfig.layer[layer].min;
    return minColor.clone().lerp(colorConfig.layer[layer].max, t);
  } else {
    const minColor = colorConfig.default.min;
    return minColor.clone().lerp(colorConfig.default.max, t);
  }
}

/**
 * Union of two { position, scale } AABBs
 * @param {{position: THREE.Vector3, scale: THREE.Vector3}} a
 * @param {{position: THREE.Vector3, scale: THREE.Vector3}} b
 * @returns {{position: THREE.Vector3, scale: THREE.Vector3}}
 */
function unionBoundsMC (a, b) {
  const ap = a.position, as = a.scale;
  const bp = b.position, bs = b.scale;

  const ahs_x = as.x * 0.5, ahs_y = as.y * 0.5, ahs_z = as.z * 0.5;
  const bhs_x = bs.x * 0.5, bhs_y = bs.y * 0.5, bhs_z = bs.z * 0.5;

  const amin_x = ap.x - ahs_x, amin_y = ap.y - ahs_y, amin_z = ap.z - ahs_z;
  const amax_x = ap.x + ahs_x, amax_y = ap.y + ahs_y, amax_z = ap.z + ahs_z;
  const bmin_x = bp.x - bhs_x, bmin_y = bp.y - bhs_y, bmin_z = bp.z - bhs_z;
  const bmax_x = bp.x + bhs_x, bmax_y = bp.y + bhs_y, bmax_z = bp.z + bhs_z;

  const umin_x = amin_x < bmin_x ? amin_x : bmin_x;
  const umin_y = amin_y < bmin_y ? amin_y : bmin_y;
  const umin_z = amin_z < bmin_z ? amin_z : bmin_z;
  const umax_x = amax_x > bmax_x ? amax_x : bmax_x;
  const umax_y = amax_y > bmax_y ? amax_y : bmax_y;
  const umax_z = amax_z > bmax_z ? amax_z : bmax_z;

  return {
    position: new THREE.Vector3(
      (umin_x + umax_x) * 0.5, (umin_y + umax_y) * 0.5, (umin_z + umax_z) * 0.5
    ),
    scale: new THREE.Vector3(
      umax_x - umin_x, umax_y - umin_y, umax_z - umin_z
    )
  };
}

function getPositionAndScale (index, pos, scale, matrixCache, layer, setIndex, out) {
  // Detect negative zero or negative index
  const isNegative = 1 / index === -Infinity || index < 0;

  if (!isNegative) {
    out[0] = pos[index];
    out[1] = pos[index + 1];
    out[2] = pos[index + 2];
    out[3] = scale[index];
    out[4] = scale[index + 1];
    out[5] = scale[index + 2];
    return out;
  }

  // Negative index — fetch from matrixCache
  const indexABS = Math.abs(index);
  const target = setIndex !== null
    ? matrixCache[layer][setIndex]
    : matrixCache[layer];

  out[0] = target.pos[indexABS];
  out[1] = target.pos[indexABS + 1];
  out[2] = target.pos[indexABS + 2];
  out[3] = target.scale[indexABS];
  out[4] = target.scale[indexABS + 1];
  out[5] = target.scale[indexABS + 2];
  return out;
}

export function createBVHTree (matrixCache, node, layer, setIndex, availableSets, matrixWorld, totalOffset) {
  const fX = node.fXaxis.fNbins;
  const fY = node.fYaxis.fNbins;
  const fZ = node.fZaxis.fNbins;

  let offset = 0;   //pridaj offset ked budes robit Y, Z
  let index = 0;
  const pos = new Float32Array(((fX * fY * fZ) - 1) * 3);
  const scale = new Float32Array(((fX * fY * fZ) - 1) * 3);
  const left = new Float32Array((fX * fY * fZ) - 1);
  const right = new Float32Array((fX * fY * fZ) - 1);
  const indexBVH = new Float32Array((fX * fY * fZ) - 1);
  const tTargetA = new Float32Array(6);
  const tTargetB = new Float32Array(6);

  const setObject = (union) => {
    const multipliedIndex = arrayIndex * 3;
    pos[multipliedIndex] = union[0];
    pos[multipliedIndex + 1] = union[1];
    pos[multipliedIndex + 2] = union[2];
    scale[multipliedIndex] = union[3];
    scale[multipliedIndex + 1] = union[4];
    scale[multipliedIndex + 2] = union[5];
    left[arrayIndex] = union[6];
    right[arrayIndex] = union[7];
    indexBVH[arrayIndex] = union[8];
  };

  const unionBounds = (indexA, indexB, layer, setIndex) => {
    // Fetch A and B transforms into preallocated buffers
    getPositionAndScale(indexA, pos, scale, matrixCache, layer, setIndex, tTargetA);
    getPositionAndScale(indexB, pos, scale, matrixCache, layer, setIndex, tTargetB);

    // Union min/max
    const umin_x = (tTargetA[0] - (tTargetA[3] * 0.5)) < (tTargetB[0] - (tTargetB[3] * 0.5))
      ? (tTargetA[0] - (tTargetA[3] * 0.5))
      : (tTargetB[0] - (tTargetB[3] * 0.5));
    const umin_y = (tTargetA[1] - (tTargetA[4] * 0.5)) < (tTargetB[1] - (tTargetB[4] * 0.5))
      ? (tTargetA[1] - (tTargetA[4] * 0.5))
      : (tTargetB[1] - (tTargetB[4] * 0.5));
    const umin_z = (tTargetA[2] - (tTargetA[5] * 0.5)) < (tTargetB[2] - (tTargetB[5] * 0.5))
      ? (tTargetA[2] - (tTargetA[5] * 0.5))
      : (tTargetB[2] - (tTargetB[5] * 0.5));

    const umax_x = (tTargetA[0] + (tTargetA[3] * 0.5)) > (tTargetB[0] + (tTargetB[3] * 0.5))
      ? (tTargetA[0] + (tTargetA[3] * 0.5))
      : (tTargetB[0] + (tTargetB[3] * 0.5));
    const umax_y = (tTargetA[1] + (tTargetA[4] * 0.5)) > (tTargetB[1] + (tTargetB[4] * 0.5))
      ? (tTargetA[1] + (tTargetA[4] * 0.5))
      : (tTargetB[1] + (tTargetB[4] * 0.5));
    const umax_z = (tTargetA[2] + (tTargetA[5] * 0.5)) > (tTargetB[2] + (tTargetB[5] * 0.5))
      ? (tTargetA[2] + (tTargetA[5] * 0.5))
      : (tTargetB[2] + (tTargetB[5] * 0.5));

    // Return the union bounds
    const out = new Float32Array(9);
    out[0] = (umin_x + umax_x) * 0.5;
    out[1] = (umin_y + umax_y) * 0.5;
    out[2] = (umin_z + umax_z) * 0.5;
    out[3] = umax_x - umin_x;
    out[4] = umax_y - umin_y;
    out[5] = umax_z - umin_z;
    return out;
  };

  let arrayIndex = 0;

  const _result = {
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 0, y: 0, z: 0 }
  };

  for (let k = 0; k < fY; k++) {

    for (let j = 0; j < fZ; j++) {

      const start = offset + totalOffset;
      let tree = new Array(fX);

      for (let i = 0; i < fX; i++) {
        tree[i] = -i - start;
      }

      while (tree.length > 1) {
        let xPos = 0;
        const n = Math.floor(tree.length / 2);
        // const newTree = [];

        for (let i = 0; i < n; i++) {
          const el1 = tree[xPos];
          const el2 = tree[xPos + 1];

          //union [3x pos, 3x scale, left, right, index]
          const union = unionBounds(el1 * 3, el2 * 3, layer, setIndex);
          tree.splice(xPos, 2, arrayIndex);

          applyWorldMatrix(union, matrixWorld);
          union[6] = 1 / el1 === -Infinity || el1 < 0
            ? el1
            : indexBVH[el1];
          union[7] = 1 / el2 === -Infinity || el2 < 0
            ? el2
            : indexBVH[el2];
          union[8] = index;

          setObject(union);

          arrayIndex += 1;
          index += 1;
          xPos += 1;
        }
      }
      offset += fX;
    }

    //tree2 consists of indexes of last tempX (whole rows)
    const tree2 = new Array(fZ);
    for (let i = 0; i < fZ; i++) {
      tree2[i] = arrayIndex - 1 - ((fZ - 1 - i) * (fX - 1));
    }

    while (tree2.length > 1) {
      let xPos = 0;
      const n = Math.floor(tree2.length / 2);

      for (let i = 0; i < n; i++) {
        const el1 = tree2[xPos];
        const el2 = tree2[xPos + 1];
        const union = unionBounds(el1 * 3, el2 * 3, layer, setIndex);//*3 to match indexing
        tree2.splice(xPos, 2, arrayIndex);

        applyWorldMatrix(union, matrixWorld);
        union[6] = indexBVH[el1];
        union[7] = indexBVH[el2];
        union[8] = index;

        setObject(union);

        arrayIndex += 1;
        index += 1;
        xPos += 1;
      }

    }
    // console.log(BVHTempY)
  }
  const tree3 = new Array(fY);
  for (let i = 0; i < fY; i++) {
    tree3[i] = arrayIndex - 1 - ((fY - 1 - i) * ((fX * fZ) - 1));
  }

  while (tree3.length > 1) {
    let xPos = 0;
    const n = Math.floor(tree3.length / 2);

    for (let i = 0; i < n; i++) {
      const el1 = tree3[xPos];
      const el2 = tree3[xPos + 1];
      const union = unionBounds(el1 * 3, el2 * 3, layer, setIndex);
      tree3.splice(xPos, 2, arrayIndex);

      applyWorldMatrix(union, matrixWorld);
      union[6] = indexBVH[el1];
      union[7] = indexBVH[el2];
      union[8] = index;

      setObject(union);

      arrayIndex += 1;
      index += 1;
      xPos += 1;
    }
  }

  return {
    pos: pos,
    scale: scale,
    left: left,
    right: right
  };
}

export function createBVHTreeRecursive (matrixCache, node, layer, selectedSet, availableSets, matrixWorld, maxInstancesPerLayer) {
  const finalTree = new Array(matrixCache.length).fill().map(v => []);
  finalTree[finalTree.length - 1] = Array.from(
    { length: availableSets.length },
    () => []
  );

  finalTree[0] = [createBVHTree(
    matrixCache, node, layer, null,
    availableSets, matrixWorld, 0
  )];

  const traverse = (currentNode, currentLayer, offset) => {
    if (!currentNode.children) return;
    //ak ma children zadefinuj counter
    const counter = new RadixCounter([
      currentNode.fXaxis.fNbins,
      currentNode.fYaxis.fNbins,
      currentNode.fZaxis.fNbins]
    );

    //num of instances
    const n = currentNode.fXaxis.fNbins * currentNode.fYaxis.fNbins * currentNode.fZaxis.fNbins;

    //offset of histogram in whole matrix cache
    const stepOffset = maxInstancesPerLayer.slice(1, currentLayer - 1)
      .reduce((acc, value) => {
        return acc * value;
      }, maxInstancesPerLayer[1]);

    //offset by one histogram on current layer
    const step = maxInstancesPerLayer[currentLayer];
    for (let j = 0; j < n; j++) {
      const relPos = { x: counter.getValueAt(0), y: counter.getValueAt(1), z: counter.getValueAt(2) };
      if (currentNode?.children?.content) {

        // const startIndex = (j * step) + (offset * maxInstancesPerLayer[currentLayer]);
        // let shouldBuild = false;
        // for (
        //   let rendIndex = startIndex;
        //   rendIndex < startIndex + maxInstancesPerLayer[currentLayer];
        //   rendIndex++
        // ){
        //   if (matrixCache[currentLayer].rendered[rendIndex] !== -1) {
        //     shouldBuild = true;
        //     break;
        //   }
        // }
        // if (!shouldBuild) {
        //   //pushuje null ked nie je vyrenderovany
        //   finalTree[currentLayer].push(null);
        //   counter.increment();
        //   continue;
        // }

        const childNode = currentNode.children.content[currentNode.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)];
        finalTree[currentLayer][j + offset] = createBVHTree(
          matrixCache, childNode, currentLayer, null,
          availableSets, matrixWorld, (j + offset) * step
        );

        traverse(childNode, currentLayer + 1, ((counter.getIndex() + offset) * stepOffset));

      } else if (currentNode.children && !currentNode.children.hasOwnProperty("content")) {
        selectedSet.forEach((set => {
          const setIndex = availableSets.indexOf(set);

          const startIndex = (j + offset) * step;
          let shouldBuild = false;
          for (
            let rendIndex = startIndex;
            rendIndex < startIndex + maxInstancesPerLayer[currentLayer];
            rendIndex++
          ){
            if (matrixCache[currentLayer][setIndex].rendered[rendIndex] !== -1) {
              shouldBuild = true;
              break;
            }
          }
          if (!shouldBuild) {
            finalTree[currentLayer][setIndex].push(null);
            return;
          }

          const childNode = currentNode.children[set][currentNode.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)];
          if (!childNode) return;
          finalTree[currentLayer][setIndex][j + offset] = createBVHTree(
            matrixCache, childNode, currentLayer, setIndex, availableSets,
            matrixWorld, (j + offset) * step
          );
          traverse(childNode, currentLayer + 1,
            ((counter.getIndex() + offset) * stepOffset)
          );
        }));
      }
      if (counter.increment() === false) break;
    }
  };
  traverse(node, 1, 0);
  return finalTree;
}

function applyWorldMatrix (box, matrixWorld) {
  const e = matrixWorld.elements;

  const sx = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]);
  const sy = Math.sqrt(e[4] * e[4] + e[5] * e[5] + e[6] * e[6]);
  const sz = Math.sqrt(e[8] * e[8] + e[9] * e[9] + e[10] * e[10]);

  box[0] = box[0] * sx + e[12];
  box[1] = box[1] * sy + e[13];
  box[2] = box[2] * sz + e[14];

  box[3] = box[3] * sx;
  box[4] = box[4] * sy;
  box[5] = box[5] * sz;

}