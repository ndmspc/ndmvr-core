


/**
*Instead of GetBinCoord, which is added to the JSRoot object only when rendered by JSRoot.
*
*/
function GetBinUpperEdge(rootObjAxis,rootBinRelPosOnAxis){
  if (rootBinRelPosOnAxis <= 0) return rootObjAxis.fXmin;
  if (rootBinRelPosOnAxis > rootObjAxis.fNbins) return rootObjAxis.fXmax;
  // console.log(`GetBinUpperEdge: ${rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis)} > ${rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis+1)}`);
  return(rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis+1)); 
}


function getRootMinMaxBinSizeByAxis(rootObjAxis){
  const minMaxBinSizeByAxis ={
    min:undefined,
    max:undefined
  }
  let binSize = 0;
  const varBinsNo = rootObjAxis.fXbins.length;
  if (varBinsNo>1){ //variable binning with at least two bins
    minMaxBinSizeByAxis.min = rootObjAxis.fXbins[1]-rootObjAxis.fXbins[0];
    minMaxBinSizeByAxis.max = minMaxBinSizeByAxis.min;
    for (let i = 2 ; i < varBinsNo ; i++) {
        binSize = rootObjAxis.fXbins[i]-rootObjAxis.fXbins[i-1];
        minMaxBinSizeByAxis.min = Math.min(minMaxBinSizeByAxis.min, binSize);
        minMaxBinSizeByAxis.max = Math.max(minMaxBinSizeByAxis.max, binSize);
    }    
  }else{//standard binning or variable binning with 1 bin
    minMaxBinSizeByAxis.min = (rootObjAxis.fXmax - rootObjAxis.fXmin)/rootObjAxis.fNbins;
    minMaxBinSizeByAxis.max = minMaxBinSizeByAxis.min;
  }
  return (minMaxBinSizeByAxis);
}

function getRootMinMaxBinSizes(rootObj){
  const rootMinMaxBinSizes = {
    x:undefined,
    y:undefined,
    z:undefined
  }
  if(rootObj.fXaxis){
    rootMinMaxBinSizes.x = getRootMinMaxBinSizeByAxis(rootObj.fXaxis);
  }
  if(rootObj.fYaxis){
    rootMinMaxBinSizes.y = getRootMinMaxBinSizeByAxis(rootObj.fYaxis);
  }
  if(rootObj.fZaxis){
    rootMinMaxBinSizes.z = getRootMinMaxBinSizeByAxis(rootObj.fZaxis);
  }
  return rootMinMaxBinSizes;
}



function getRootBinSizePosByAxis(rootObjAxis,rootBinRelPosOnAxis){
  const rootBinSizePosByAxis={
    size: undefined,
    pos:  undefined
  }
  const binFromByAxis = rootObjAxis.GetBinLowEdge(rootBinRelPosOnAxis);
  // const binToByAxis = rootObjAxis.GetBinCoord(rootBinRelPosOnAxis);
  const binToByAxis = GetBinUpperEdge(rootObjAxis,rootBinRelPosOnAxis);
  const binSizeByAxis = binToByAxis - binFromByAxis;
  
  rootBinSizePosByAxis.size = binSizeByAxis;
  rootBinSizePosByAxis.pos  = binFromByAxis + binSizeByAxis/2; //pos=position
  
  return(rootBinSizePosByAxis);  
}

function getRootBinSizePos(rootObj,rootBinRelPos){
  const rootBinSizePos = {
    x:undefined,
    y:undefined,
    z:undefined
  }
  if(rootObj.fXaxis){
    rootBinSizePos.x = getRootBinSizePosByAxis(rootObj.fXaxis,rootBinRelPos.x);
  }
  if(rootObj.fYaxis){
    rootBinSizePos.y = getRootBinSizePosByAxis(rootObj.fYaxis,rootBinRelPos.y);
  }
  if(rootObj.fZaxis){
    rootBinSizePos.z = getRootBinSizePosByAxis(rootObj.fZaxis,rootBinRelPos.z);
  }
  
  return rootBinSizePos;
  
}

function rootSizePosToAFrame(jsrootSizePos){
  const aframeSizePos = {
    x:undefined,
    y:undefined,
    z:undefined
  }
  //x is left unchanged
  if(jsrootSizePos.x){
    aframeSizePos.x ={
      size: jsrootSizePos.x.size,
      pos: jsrootSizePos.x.pos
    };
  }
  //z becomes y
  if(jsrootSizePos.z){
    aframeSizePos.y ={
      size: jsrootSizePos.z.size,
      pos: jsrootSizePos.z.pos
    };
  }
  //-y becomes z
  if(jsrootSizePos.y){
    aframeSizePos.z ={
      size: jsrootSizePos.y.size,
      pos: -jsrootSizePos.y.pos
    };    
  }    
  return (aframeSizePos);
}



/**
* This version assumes that 
* - bins start at 0 in all axes
* - 1 is the smallest bin dimension in all axes
*/
function computeAFrameBinSizePos(rootObj,rootBinRelPos,padding){
  
  const absRootBinSizePos = getRootBinSizePos(rootObj,rootBinRelPos);
  
  for (let axis in absRootBinSizePos){
    if(absRootBinSizePos[axis]){
      absRootBinSizePos[axis].pos = absRootBinSizePos[axis].pos + padding[axis]*(rootBinRelPos[axis]-1);
      // console.log(axis, absRootBinSizePos[axis], padding[axis], rootBinRelPos[axis]);      
    }
  }
  
  //TODO: resolve TH1 and TH2 (height = content); for TH3 height = scale
  
  return rootSizePosToAFrame(absRootBinSizePos);
}



