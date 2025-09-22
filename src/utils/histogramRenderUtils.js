import RadixCounter from './radixCounter.js'

/**
 *Instead of GetBinCoord, which is added to the JSRoot object only when rendered by JSRoot.
 *
 */
function GetBinUpperEdge (rootObjAxis, rootBinRelPosOnAxis) {
  if (rootBinRelPosOnAxis <= 0) return rootObjAxis.fXmin
  if (rootBinRelPosOnAxis > rootObjAxis.fNbins) return rootObjAxis.fXmax
  // console.log(`GetBinUpperEdge: ${rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis)} > ${rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis+1)}`);
  return (rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis + 1))
}

function getRootMinMaxBinSizeByAxis (rootObjAxis) {
  const minMaxBinSizeByAxis = {
    min: undefined,
    max: undefined
  }
  let binSize = 0
  const varBinsNo = rootObjAxis.fXbins.length
  if (varBinsNo > 1) { //variable binning with at least two bins
    minMaxBinSizeByAxis.min = rootObjAxis.fXbins[1] - rootObjAxis.fXbins[0]
    minMaxBinSizeByAxis.max = minMaxBinSizeByAxis.min
    for (let i = 2; i < varBinsNo; i++) {
      binSize = rootObjAxis.fXbins[i] - rootObjAxis.fXbins[i - 1]
      minMaxBinSizeByAxis.min = Math.min(minMaxBinSizeByAxis.min, binSize)
      minMaxBinSizeByAxis.max = Math.max(minMaxBinSizeByAxis.max, binSize)
    }
  } else {//standard binning or variable binning with 1 bin
    minMaxBinSizeByAxis.min = (rootObjAxis.fXmax - rootObjAxis.fXmin) / rootObjAxis.fNbins
    minMaxBinSizeByAxis.max = minMaxBinSizeByAxis.min
  }
  return (minMaxBinSizeByAxis)
}

export function getRootMinMaxBinSizes (rootObj) {
  const rootMinMaxBinSizes = {
    x: undefined,
    y: undefined,
    z: undefined
  }
  if (rootObj.fXaxis) {
    rootMinMaxBinSizes.x = getRootMinMaxBinSizeByAxis(rootObj.fXaxis)
  }
  if (rootObj.fYaxis) {
    rootMinMaxBinSizes.y = getRootMinMaxBinSizeByAxis(rootObj.fYaxis)
  }
  if (rootObj.fZaxis) {
    rootMinMaxBinSizes.z = getRootMinMaxBinSizeByAxis(rootObj.fZaxis)
  }
  return rootMinMaxBinSizes
}

export function changePos (jsrootSizePos) {
  const aframeSizePos = {
    x: undefined,
    y: undefined,
    z: undefined
  }
  aframeSizePos.x = {
    size: jsrootSizePos.x.size,
    pos: -jsrootSizePos.x.pos
  }
  aframeSizePos.z = {
    size: jsrootSizePos.z.size,
    pos: jsrootSizePos.z.pos
  }
  aframeSizePos.y = {
    size: jsrootSizePos.y.size,
    pos: jsrootSizePos.y.pos
  }
  return (aframeSizePos)
}

export function rootSizePosToAFrameNeg (jsrootSizePos) {
  const aframeSizePos = {
    x: undefined,
    y: undefined,
    z: undefined
  }
  aframeSizePos.x = {
    size: jsrootSizePos.x.size,
    pos: jsrootSizePos.x.pos
  }
  aframeSizePos.y = {
    size: jsrootSizePos.z.size,
    pos: -jsrootSizePos.z.pos
  }
  aframeSizePos.z = {
    size: jsrootSizePos.y.size,
    pos: jsrootSizePos.y.pos
  }
  return (aframeSizePos)
}

/**
 * Get bin's size and position relative to histogram axis.
 * @param rootObjAxis defines on which axis position and size is returned.
 * @param rootBinRelPosOnAxis index of bin on axis.
 * @param size defines size of dimension on axis.
 * @param padding defines padding on axis.
 * */
function getRootBinSizePosByAxis (rootObjAxis, rootBinRelPosOnAxis, size, padding, offset, layer) {
  const rootBinSizePosByAxis = {
    size: undefined,
    pos: undefined
  }
  const binLowEdge = rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis + 1)
  const binUpperEdge = GetBinUpperEdge(rootObjAxis, rootBinRelPosOnAxis + 1)
  const binSizeByAxis = Math.abs(binUpperEdge - binLowEdge)

  rootBinSizePosByAxis.size = binSizeByAxis

  //bin low edge + half of width * scale relative to size of whole histogram

  rootBinSizePosByAxis.pos = binLowEdge + (binSizeByAxis / 2) - rootObjAxis.fXmin

  const wholeSize = rootObjAxis.fXmax - rootObjAxis.fXmin
  const sizeWoPadding = size - padding * (rootObjAxis.fNbins - 1)

  if (size) {
    rootBinSizePosByAxis.pos /= (wholeSize / sizeWoPadding)
    rootBinSizePosByAxis.size /= (wholeSize / sizeWoPadding)

    rootBinSizePosByAxis.pos -= size / 2
    rootBinSizePosByAxis.pos += offset
  }
  rootBinSizePosByAxis.pos += padding * (rootBinRelPosOnAxis)

  // if (rootObjAxis.fXmin < 0) {
  //    if (size) {
  //       const off = (0 - rootObjAxis.fXmin);
  //       rootBinSizePosByAxis.pos += off / (wholeSize / size)
  //    } else {
  //       rootBinSizePosByAxis.pos += (0 - rootObjAxis.fXmin);
  //    }
  // }

  return (rootBinSizePosByAxis)
}

/**
 * Get bin's size and position relative to histogram axis.
 * */
function getRootBinSizePos (rootObj, rootBinRelPos, size, padding, offset, layer) {
  const rootBinSizePos = {
    x: undefined,
    y: undefined,
    z: undefined
  }
  if (rootObj.fXaxis) {
    rootBinSizePos.x = getRootBinSizePosByAxis(rootObj.fXaxis, rootBinRelPos.x, size?.x, padding?.x, offset?.x, layer)
  }
  if (rootObj.fYaxis) {
    rootBinSizePos.y = getRootBinSizePosByAxis(rootObj.fYaxis, rootBinRelPos.y, size?.z, padding?.y, offset?.z, layer)
  }
  if (rootObj.fZaxis) {
    rootBinSizePos.z = getRootBinSizePosByAxis(rootObj.fZaxis, rootBinRelPos.z, size?.y, padding?.z, offset?.y, layer)
  }

  // return rootSizePosToAFrame(rootBinSizePos);
  return rootBinSizePos

}

export function rootSizePosToAFrame (jsrootSizePos) {
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
    }
  }
  //z becomes y
  if (jsrootSizePos.z) {
    aframeSizePos.y = {
      size: jsrootSizePos.z.size,
      pos: jsrootSizePos.z.pos
    }
  }
  //-y becomes z
  if (jsrootSizePos.y) {
    aframeSizePos.z = {
      size: jsrootSizePos.y.size,
      pos: jsrootSizePos.y.pos
    }
  }
  return (aframeSizePos)
}

export function limitMatrixInit (rootObj, layer) {
  const limitMatrix = new THREE.Object3D()
  const axisIndex = (layer * 3)
  const limitInit = {
    x: undefined,
    y: undefined,
    z: undefined
  }
  if (rootObj[axisIndex]) {
    limitInit.x = rootObj[axisIndex].value.fXaxis.fXmax - rootObj[axisIndex].value.fXaxis.fXmax
    limitInit.y = rootObj[axisIndex].value.fYaxis.fXmax - rootObj[axisIndex].value.fYaxis.fXmax
    limitInit.z = rootObj[axisIndex].value.fZaxis.fXmax - rootObj[axisIndex].value.fZaxis.fXmax
  }
  if (rootObj[axisIndex + 1]) {
    limitInit.y = rootObj[axisIndex + 1].value.fYaxis.fXmax - rootObj[axisIndex + 1].value.fYaxis.fXmax
  }
  if (rootObj[axisIndex + 2]) {
    limitInit.z = rootObj[axisIndex + 2].value.fZaxis.fXmax - rootObj[axisIndex + 2].value.fZaxis.fXmax
  }
  limitMatrix.scale.set(limitInit.x, limitInit.y, limitInit.z)

  return limitMatrix
}

/**
 * This version assumes that
 * - bins start at 0 in all axes
 * - 1 is the smallest bin dimension in all axes
 */
export function computeAFrameBinSizePos (rootObj, rootBinRelPos, padding, size, offset, layer) {

  const absRootBinSizePos = getRootBinSizePos(rootObj, rootBinRelPos, size, padding, offset, layer)

  if (!size) {
    for (let axis in absRootBinSizePos) {
      absRootBinSizePos[axis].pos = absRootBinSizePos[axis].pos + padding[axis] * (rootBinRelPos[axis] - 1)
      // console.log(axis, absRootBinSizePos[axis], padding[axis], rootBinRelPos[axis]);
    }
  }

  //TODO: resolve TH1 and TH2 (height = content); for TH3 height = scale

  // return rootSizePosToAFrame(absRootBinSizePos);
  return absRootBinSizePos
}

/**
 * Flips target Z position by limitMatrix.
 * Origin of rotation is at center of limitMatrix.
 * */
export function flipLocalZAxis (limitMatrix, target) {
  const posZ = limitMatrix.position.z
  const scaleZ = limitMatrix.scale.z
  const minZ = Math.min(posZ, posZ + scaleZ)
  return 2 * minZ - target
}

export function stringToXYZ (str) {
  const [x, y, z] = str.split(' ').map(Number)
  return { x, y, z }
}

/**
 * Union of two { position, scale } AABBs
 * @param {{position: THREE.Vector3, scale: THREE.Vector3}} a
 * @param {{position: THREE.Vector3, scale: THREE.Vector3}} b
 * @returns {{position: THREE.Vector3, scale: THREE.Vector3}}
 */
function unionBounds (a, b) {
  // console.log('el1: ', a, ', el2: ', b);

  // Compute min/max corners of first object
  // Since scale is full size, half of it extends in each direction
  if (!a?.position) {
    console.log('neprejde')
  }
  const aMin = new THREE.Vector3().subVectors(
    a.position,
    new THREE.Vector3().copy(a.scale).divideScalar(2)
  )
  const aMax = new THREE.Vector3().addVectors(
    a.position,
    new THREE.Vector3().copy(a.scale).divideScalar(2)
  )

  // Compute min/max corners of second object
  const bMin = new THREE.Vector3().subVectors(
    b.position,
    new THREE.Vector3().copy(b.scale).divideScalar(2)
  )
  const bMax = new THREE.Vector3().addVectors(
    b.position,
    new THREE.Vector3().copy(b.scale).divideScalar(2)
  )

  // Find the actual union bounds
  const unionMin = new THREE.Vector3(
    Math.min(aMin.x, bMin.x),
    Math.min(aMin.y, bMin.y),
    Math.min(aMin.z, bMin.z)
  )
  const unionMax = new THREE.Vector3(
    Math.max(aMax.x, bMax.x),
    Math.max(aMax.y, bMax.y),
    Math.max(aMax.z, bMax.z)
  )

  // console.log('unionMin: ', unionMin, ', unionMax: ', unionMax);

  // Calculate center position and full scale
  const position = new THREE.Vector3().addVectors(unionMin, unionMax).divideScalar(2)
  const scale = new THREE.Vector3().subVectors(unionMax, unionMin)

  // console.log({position, scale});

  return { position, scale }
}

// export function createBVHTree(matrixCache, node, layer, set, matrixWorld, totalOffset) {
//     const fX = node.fXaxis.fNbins;
//     const fY = node.fYaxis.fNbins;
//     const fZ = node.fZaxis.fNbins;
//
//     let globalIndex = 0;
//     let BVH = [];
//
//     // Helper function to build a binary tree from an array of elements
//     function buildBinaryTree(elements) {
//         if (elements.length <= 1) return elements;
//
//         const tree = [...elements]; // Work with a copy
//         const treeNodes = [];
//
//         while (tree.length > 1) {
//             const pairCount = Math.floor(tree.length / 2);
//
//             // Process pairs in reverse to avoid index shifting issues
//             for (let i = pairCount - 1; i >= 0; i--) {
//                 const leftIdx = i * 2;
//                 const rightIdx = leftIdx + 1;
//
//                 const left = tree[leftIdx];
//                 const right = tree[rightIdx];
//                 const union = unionBounds(left, right);
//
//                 applyWorldMatrix(union, matrixWorld);
//                 union.left = left.index;
//                 union.right = right.index;
//                 union.index = globalIndex++;
//
//                 treeNodes.push(union);
//                 tree.splice(leftIdx, 2, union);
//             }
//         }
//
//         return treeNodes;
//     }
//
//     // Build X-axis trees for each Y-Z slice
//     let offset = 0;
//     const ySlices = [];
//
//     for (let k = 0; k < fY; k++) {
//         const zSlices = [];
//
//         for (let j = 0; j < fZ; j++) {
//             // Create X-axis elements with negative indices to distinguish from internal nodes
//             const xElements = matrixCache[layer]
//                 .slice(offset + totalOffset, offset + fX + totalOffset)
//                 .map((v, i) => ({...v, index: -(i + offset + totalOffset)}));
//             console.log('xElements: ', xElements, 'slice opts, offset: ', offset, ', totalOffset: ', totalOffset, ', fX: ', fX);
//
//             const xTree = buildBinaryTree(xElements);
//             console.log('xTree: ', xTree);
//             zSlices.push(xTree);
//             offset += fX;
//         }
//
//         // Build Z-axis tree from the last nodes of each Z slice
//         const zRootElements = zSlices.map(slice => slice[slice.length - 1]);
//         const zTree = buildBinaryTree(zRootElements);
//
//         // Collect all nodes from this Y slice
//         const ySliceNodes = [...zSlices.flat(), ...zTree];
//         ySlices.push(ySliceNodes);
//     }
//
//     // Build Y-axis tree from the last nodes of each Y slice
//     const yRootElements = ySlices.map(slice => slice[slice.length - 1]);
//     const yTree = buildBinaryTree(yRootElements);
//
//     // Combine all nodes
//     BVH = [...ySlices.flat(), ...yTree];
//
//     // Clean up temporary index property
//     BVH.forEach(node => delete node.index);
//
//     console.log(BVH);
//     return BVH;
// }

export function createBVHTree (matrixCache, node, layer, set, availableSets, matrixWorld, totalOffset) {
  const fX = node.fXaxis.fNbins
  const fY = node.fYaxis.fNbins
  const fZ = node.fZaxis.fNbins

  let offset = 0   //pridaj offset ked budes robit Y, Z
  let index = 0
  let BVH = []

  for (let k = 0; k < fY; k++) {
    let BVHTempY = []

    for (let j = 0; j < fZ; j++) {
      //merge X layer
      const tree = set
        ? matrixCache[layer][availableSets.indexOf(set)]
          .slice(offset + totalOffset, offset + fX + totalOffset)
          .map((v, i) => ({ ...v, index: -i - offset - totalOffset }))
        : matrixCache[layer]
          .slice(offset + totalOffset, offset + fX + totalOffset)
          .map((v, i) => ({ ...v, index: -i - offset - totalOffset }))
      // const tree = matrixCache[layer]
      //     .slice(offset + totalOffset, offset + fX + totalOffset)
      //     .map((v, i) => ({...v, index: -i - offset - totalOffset}));
      const BVHTempX = []

      while (tree.length > 1) {
        let xPos = 0
        const n = Math.floor(tree.length / 2)

        for (let i = 0; i < n; i++) {
          const el1 = tree[xPos]
          const el2 = tree[xPos + 1]
          const union = unionBounds(el1, el2)
          tree.splice(xPos, 2, union)
          applyWorldMatrix(union, matrixWorld)
          union.left = el1.index
          union.right = el2.index
          union.index = index
          BVHTempX.push(union)
          index += 1
          xPos += 1
        }

      }
      BVHTempY.push(BVHTempX)
      offset += fX
    }

    const tree2 = BVHTempY.map(a => a[a.length - 1])
    BVHTempY = BVHTempY.flat()

    while (tree2.length > 1) {
      let xPos = 0
      const n = Math.floor(tree2.length / 2)

      for (let i = 0; i < n; i++) {
        const el1 = tree2[xPos]
        const el2 = tree2[xPos + 1]
        const union = unionBounds(el1, el2)
        tree2.splice(xPos, 2, union)
        applyWorldMatrix(union, matrixWorld)
        union.left = el1.index
        union.right = el2.index
        union.index = index
        BVHTempY.push(union)
        index += 1
        xPos += 1
      }

    }
    // console.log(BVHTempY)
//---
    BVH.push(BVHTempY)
  }
  const tree3 = BVH.map(a => a[a.length - 1])
  BVH = BVH.flat()

  while (tree3.length > 1) {
    let xPos = 0
    const n = Math.floor(tree3.length / 2)

    for (let i = 0; i < n; i++) {
      const el1 = tree3[xPos]
      const el2 = tree3[xPos + 1]
      const union = unionBounds(el1, el2)
      tree3.splice(xPos, 2, union)
      applyWorldMatrix(union, matrixWorld)
      union.left = el1.index
      union.right = el2.index
      union.index = index
      BVH.push(union)
      index += 1
      xPos += 1
    }
  }
  BVH.forEach(n => delete n.index)

  // console.log(BVH)
  return BVH
//---
}

export function createBVHTreeRecursive (matrixCache, node, layer, selectedSet, availableSets, matrixWorld, maxInstancesPerLayer) {
  const finalTree = new Array(matrixCache.length).fill().map(v => [])
  finalTree[finalTree.length - 1] = Array.from({ length: availableSets.length }, () => [])

  finalTree[0] = [createBVHTree(matrixCache, node, layer, null, availableSets, matrixWorld, 0)]

  const traverse = (currentNode, currentLayer, offset) => {
    if (!currentNode.children) return
    // if (node.children && !node.children.content) {
    //     console.log('koniec: ', currentNode);
    //     return;
    // }
    // console.log('traverse: ', currentLayer);
    //ak ma children zadefinuj counter
    const counter = new RadixCounter([currentNode.fXaxis.fNbins, currentNode.fYaxis.fNbins, currentNode.fZaxis.fNbins])
    const n = currentNode.fXaxis.fNbins * currentNode.fYaxis.fNbins * currentNode.fZaxis.fNbins
    const stepOffset = maxInstancesPerLayer.slice(1, currentLayer - 1)
      .reduce((acc, value) => {
          return acc * value
        }
        , maxInstancesPerLayer[1])
    // console.log('currentLayer: ', currentLayer, ', offset: ', offset, ', stepOffset: ', stepOffset);
    const step = maxInstancesPerLayer[currentLayer]
    // console.log(n, step, currentLayer)
    for (let j = 0; j < n; j++) {
      const relPos = { x: counter.getValueAt(0), y: counter.getValueAt(1), z: counter.getValueAt(2) }

      if (currentNode?.children?.content) {
        if (!matrixCache[currentLayer][(j * step) + (offset * maxInstancesPerLayer[currentLayer])]) {
          finalTree[currentLayer].push(null)
          counter.increment()
          continue
        }
        // console.log('offset: ', offset, ', prida: ', step)
        // if (currentLayer === 2) {
        //     console.log('layer: ', currentLayer ,', Tree starts: ', ((j + offset) * step), ', vola traverse na: ', (counter.getIndex() * stepOffset) + offset);
        // }
        const childNode = currentNode.children.content[currentNode.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)]
        // finalTree[currentLayer].push(createBVHTree(matrixCache, childNode, currentLayer, null, availableSets, matrixWorld, (j + offset) * step));
        finalTree[currentLayer][j + offset] = createBVHTree(matrixCache, childNode, currentLayer, null, availableSets, matrixWorld, (j + offset) * step)
        traverse(childNode, currentLayer + 1, ((counter.getIndex() + offset) * stepOffset))

      } else if (currentNode.children && !currentNode.children.hasOwnProperty('content')) {
        selectedSet.forEach((set => {
          const setIndex = availableSets.indexOf(set)
          // console.log('for: ', currentLayer, ', j: ', j);

          if (!matrixCache[currentLayer][availableSets.indexOf(set)][(j + offset) * step]) {
            finalTree[currentLayer][setIndex].push(null)
            // counter.increment();
            return
          }
          // if (currentLayer === 3) {
          //     console.log('layer: ', currentLayer ,', Tree starts: ', ((j + offset) * step), ', vola traverse na: ', (counter.getIndex() * stepOffset) + offset);
          // }
          const childNode = currentNode.children[set][currentNode.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)]
          // finalTree[currentLayer][setIndex].push(createBVHTree(matrixCache, childNode, currentLayer, set, availableSets, matrixWorld, (j + offset) * step));
          finalTree[currentLayer][setIndex][j + offset] = createBVHTree(matrixCache, childNode, currentLayer, set, availableSets, matrixWorld, (j + offset) * step)
          traverse(childNode, currentLayer + 1, ((counter.getIndex() + offset) * stepOffset))
        }))
      }
      if (counter.increment() === false) break
    }
    // if (currentLayer > finalTree.length - 1) return;
    // if (Array.isArray(finalTree[currentLayer]?.[0]?.[0])){
    //     selectedSet.forEach(set => {
    //         finalTree[currentLayer][availableSets.indexOf(set)] = finalTree[currentLayer][availableSets.indexOf(set)].flat();
    //     });
    // } else {
    //     finalTree[currentLayer] = finalTree[currentLayer].flat();
    // }
  }
  // console.log('MIPL: ', maxInstancesPerLayer)
  traverse(node, 1, 0)

  // console.log(finalTree);
  return finalTree
  // createBVHTree(matrixCache, node, layer, set, matrixWorld);
}

function getChildren (index, layerWidth) {
  if (index === 0) {
    console.log('index je 0 => children 1,2')
    return
  }
  const depth = getDepth(index, layerWidth)
  const start = layerWidth[depth + 1] - 1

  const sumAbove = layerWidth
    .slice(0, depth)
    .reduce((acc, value) => {
      return acc + value
    }, 0)

  if (layerWidth[depth] % 2 === 0) { //is even
    const pos = index - sumAbove
    const leftIndex = start + (pos * 2) + 1
    const rightIndex = start + (pos * 2)
    if (start + (pos * 2) < sumAbove + layerWidth[depth]) {
      console.log('special case, right index: ', rightIndex + layerWidth[depth + 1] + 1)

    }
    console.log('dept: ', depth, ', start: ', start, ', pos: ', pos, ', leftIndex: ', leftIndex, ', rightIndex: ', rightIndex)
  } else {
    const pos = index - sumAbove + 1
    const leftIndex = start + (pos * 2)
    const rightIndex = start + (pos * 2) - 1
    console.log('dept: ', depth, ', start: ', start, ', pos: ', pos, ', leftIndex: ', leftIndex, ', rightIndex: ', rightIndex)
  }

  // const pos = layerWidth[depth] % 2 === 0
  //     ? index - sumAbove
  //     : index - sumAbove + 1;
  // // const pos = index - sumAbove;
  //
  // const leftIndex = start + (pos * 2) + 1;
  // //right index needs to be checked if exists
  //
  //
  // console.log('dept: ', depth, ', start: ', start, ', pos: ', pos, ', leftIndex: ', leftIndex);

}

function getDepth (index, layerWidth) {
  let depth = 0
  let offset = 0
  for (let i = 0; i < 10; i++) {
    console.log(index, offset, layerWidth[depth])
    // console.log(index, offset, layerWidth.at(-(depth + 1)))
    if (index < offset + layerWidth[depth]) {
      return depth
    } else {
      offset += layerWidth[depth]
      depth += 1
    }
  }
}

function applyWorldMatrix (box, matrixWorld) {
  // Decompose matrixWorld into position and scale
  const worldPos = new THREE.Vector3()
  const worldScale = new THREE.Vector3()
  const worldQuat = new THREE.Quaternion() // ignored (no rotation in your case)

  matrixWorld.decompose(worldPos, worldQuat, worldScale)

  // Transform position: scale first, then translate
  const newPos = new THREE.Vector3()
    .copy(box.position)
    .multiply(worldScale)
    .add(worldPos)

  // Transform scale: multiply by absolute world scale
  const absWorldScale = new THREE.Vector3(
    Math.abs(worldScale.x),
    Math.abs(worldScale.y),
    Math.abs(worldScale.z)
  )

  const newScale = new THREE.Vector3().copy(box.scale).multiply(absWorldScale)

  return { position: newPos, scale: newScale }
}

// const v1 = {
//     position: new THREE.Vector3(1,1,1),
//     scale: new THREE.Vector3(1,1,1)
// }
//
// const v2 = {
//     position: new THREE.Vector3(-1,-1,-1),
//     scale: new THREE.Vector3(1,1,1)
// }
//
// unionBounds(v1, v2)