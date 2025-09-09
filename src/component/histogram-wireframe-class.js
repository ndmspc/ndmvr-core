import {configSubjectGet} from "../rxjs/ConfigSubject.js";
import {filter} from "rxjs";
import {FloatType} from "three";
import {stateSubjectGet} from "../rxjs/StateSubject.js";

export default class HistogramWireframeClass {

    wireframe = undefined;
    instGeom = undefined;
    material = undefined;
    totalInstances = undefined;
    maxInstancesPerLayer = undefined;
    instancePositions = undefined;
    instanceScales = undefined;
    instanceColors = undefined;
    colorArray = undefined;
    configSub = undefined;
    stateSub = undefined;
    config = undefined;
    numOfavailableSets = undefined;

    constructor(maxInstancesPerLayer, matrixCache) {
        this.maxInstancesPerLayer = maxInstancesPerLayer;
        this.totalInstances = this.computeTotalInstances(maxInstancesPerLayer, matrixCache);
        const baseBox = new THREE.BoxGeometry(1, 1, 1);
        const baseEdges = new THREE.EdgesGeometry(baseBox);
        this.instGeom = new THREE.InstancedBufferGeometry();
        this.instGeom.instanceCount = this.totalInstances;
        this.instGeom.frustumCulled = false;
        this.instGeom.index = baseEdges.index;

        for (const name in baseEdges.attributes) {
            this.instGeom.setAttribute(name, baseEdges.attributes[name]);
        }

        this.material = this.createMaterial();
        this.colorArray = new Float32Array(32 * 3);
        new THREE.Color(0x00FF00).toArray(this.colorArray, 0);
        // this.colorArray = new Array(32).fill().map(() => new THREE.Color());
        // this.colorArray[0].set(0x000000);
        this.material.uniforms.colorArray = {value: this.colorArray};
        this.instancePositions = new Float32Array(this.totalInstances * 3);
        // console.log(this.totalInstances * 3);
        this.instanceScales = new Float32Array(this.totalInstances * 3);
        this.instanceColors = new Float32Array(this.totalInstances);

        this.instGeom.setAttribute(
            "instancePosition",
            new THREE.InstancedBufferAttribute(this.instancePositions, 3)
        );
        this.instGeom.setAttribute(
            "instanceScale",
            new THREE.InstancedBufferAttribute(this.instanceScales, 3)
        );
        this.instGeom.setAttribute(
            "instanceColorIndex",
            new THREE.InstancedBufferAttribute(this.instanceColors, 1)
        );

        this.wireframe = new THREE.LineSegments(this.instGeom, this.material);
        this.wireframe.frustumCulled = false;

        this.stateSub = stateSubjectGet().getObservable().subscribe(v => {
            this.numOfavailableSets = v.sets.length;
        });

        this.configSub = configSubjectGet().getObservable()
            .subscribe((v) => {
                this.config = v.config.wireframe;

                new THREE.Color(this.config.color.default).toArray(this.colorArray, 0);
                this.config.color.layer
                    .map(c => new THREE.Color(c))
                    .forEach((color, i) => color.toArray(this.colorArray, (i + 1) * 3));
                this.config.color.set
                    .map(c => new THREE.Color(c))
                    .forEach((color, i) => color.toArray(this.colorArray, (this.config.color.layer.length + 1 + i) * 3));
                this.material.uniforms.colorArray = {value: this.colorArray};
                this.wireframe.material.uniformsNeedUpdate = true;
            });
    }

    getColorAt(layer, set) {
        // console.log(layer, set);
        if (this.config.color.set[set]) {
            return this.config.color.set[set];
        } else if (this.config.color.layer[layer]) {
            return this.config.color.layer[layer];
        } else {
            return this.config.color.default;
        }
    }


    render(matrixCache, startLayer, endLayer, startIndex, endIndex, setIndexes) {
        if (this.config.display.start > startLayer) startLayer = this.config.display.start;
        if ((this.config.display.end < endLayer) && (this.config.display.end <= matrixCache.length)) endLayer = this.config.display.end;

        // console.log(startLayer, endLayer, startIndex, endIndex, setIndexes);

        let offset = this.maxInstancesPerLayer
            .slice(0, startLayer)
            .reduce((acc, value) => {
                return acc + ((acc === 0 ? 1 : acc) * value);
            }, 0);
        // console.log('offset: ', offset);

        const setInstance = (index, position, scale) => {
            this.instancePositions.set([position.x, position.y, position.z], index * 3);
            this.instanceScales.set([scale.x, scale.y, scale.z], index * 3);
        }

        for (let i = startLayer; i < endLayer; i++) {
            if (this.config.layer?.[i] === false) continue;
            const wireframeOffset = 0.1 * (endLayer - Math.abs(i + startLayer + 1));
            // console.log(endLayer, i, startLayer, 0.1 * (endLayer - Math.abs(i + startLayer + 1)));
            const stepFor = this.maxInstancesPerLayer
                .slice(i + 1)
                .reduce((acc, value) => {
                    return acc * value;
                }, 1);

            const start = Math.floor(startIndex / stepFor);
            const n = Math.ceil((endIndex - startIndex) / stepFor);
            // console.log(i, wireframeOffset, start, n, stepFor);
            let result = false;

            if ((i < endLayer - 1) && (matrixCache.length > endLayer + 1)) {
                // console.log('---------------------')
                const step = stepFor / (this.maxInstancesPerLayer[i + 1] * this.maxInstancesPerLayer[i + 2]);
                const s = (Math.floor(startIndex / stepFor) * stepFor) / step;
                const e = (Math.ceil(endIndex / stepFor) * stepFor) / step;
                const v1 = startIndex / step;
                const v2 = endIndex / step;
                // console.log(step, ', s: ', s, ', e: ', e, ', v1', startIndex/step, ', v2: ', endIndex/step);
                for (let j = s; j < e; j++) {
                    if (j >= v1 && j < v2) continue;
                    // console.log('check: ', i, ', j: ', j, ', v: ', matrixCache[i + 2][j]);
                    result = result || matrixCache[i + 2][j]?.rendered === true;
                }
                // console.log(matrixCache);
            }
            // console.log('RESULT: ', result, ', i: ', i);

            if (result === true) {
                offset += (offset === 0 ? 1 : offset) * this.maxInstancesPerLayer[i];
                continue;
            }


            if (Array.isArray(matrixCache[i][0]) && this.config.displaySets === true) {
                const total = this.maxInstancesPerLayer
                    .slice(0, i + 1)
                    .reduce((acc, value) => {
                        return acc * value;
                    }, 1);
                let colorIndex = this.config.color.layer[i]
                    ? i + 1
                    : 0
                setIndexes.forEach(setIndex => {
                    if (this.config.color.set[setIndex])
                        colorIndex = this.config.color.set[setIndex + this.config.color.layer.length + 1];
                    for (let j = start; j < start + n; j++) {
                        const inst = {
                            scale: matrixCache[i][setIndex][j].scale.clone(),
                            position: matrixCache[i][setIndex][j].position.clone()
                        }
                        // console.log('setting: ', offset + j + (setIndex * total), inst.scale, wireframeOffset);
                        setInstance(offset + j + (setIndex * total), inst.position, inst.scale.addScalar(wireframeOffset));
                        this.instanceColors[offset + j + (setIndex * total)] = colorIndex
                    }
                })
            } else {
                const colorIndex = this.config.color.layer[i]
                    ? i + 1
                    : 0
                for (let j = start; j < start + n; j++) {
                    if (!matrixCache[i][j]?.scale) continue;
                    const inst = {
                        scale: matrixCache[i][j].scale.clone(),
                        position: matrixCache[i][j].position.clone()
                    }
                    setInstance(offset + j, inst.position, inst.scale.addScalar(wireframeOffset));
                    // console.log('i: ', i, ', setting: ', offset + j, inst.scale, inst.position);
                    this.instanceColors[offset + j] = colorIndex
                }
            }
            offset += (offset === 0 ? 1 : offset) * this.maxInstancesPerLayer[i];
        }

        this.instGeom.attributes.instancePosition.needsUpdate = true;
        this.instGeom.attributes.instanceScale.needsUpdate = true;
        this.instGeom.attributes.instanceColorIndex.needsUpdate = true;
    }

    dispose() {
        this.instancePositions = [];
        this.instanceScales = [];
        this.wireframe.parent.remove(this.wireframe);
        this.instGeom.dispose();
    }

    clearWireframe() {
        this.instancePositions.fill(0);
        this.instanceScales.fill(0);
        this.instanceColors.fill(0);
        this.instGeom.attributes.instancePosition.needsUpdate = true;
        this.instGeom.attributes.instanceScale.needsUpdate = true;
        this.instGeom.attributes.instanceColorIndex.needsUpdate = true;
    }


    clearSection(matrixCache, startIndex, offset, dimensions, baseLayerIndex) {
        // console.log(startIndex, offset, dimensions, baseLayerIndex);
        let currentMultiplier = this.maxInstancesPerLayer
            .slice(0, baseLayerIndex + 1)
            .reduce((acc, value) => {
                return acc * value;
            }, 1);
        // currentMultiplier -= 1;
        let layerOffset = this.maxInstancesPerLayer
            .slice(1, baseLayerIndex)
            .reduce((acc, value) => {
                return acc + (acc * value);
            }, this.maxInstancesPerLayer[0]);
        // layerOffset -= 1;

        let mult = this.maxInstancesPerLayer
            .slice(baseLayerIndex + 1)
            .reduce((acc, value) => {
                return acc * value;
            }, 1);

        for (let i = baseLayerIndex; i < baseLayerIndex + dimensions.length; i++) {
            if (i === 0) {
                // console.log(i, (Math.floor(startIndex / mult) + layerOffset),
                //     (Math.floor((startIndex + offset) / mult) + layerOffset))
            }

            // console.log(i, 'offset: ', layerOffset, ', currentMult:', currentMultiplier, ', mult: ', mult);
            if (Array.isArray(matrixCache[i][0])) {
                for (let j = 0; j < this.numOfavailableSets; j++) {
                    // console.log(i, 'start: ', ((Math.floor(startIndex / mult) + layerOffset) + (currentMultiplier * j)),
                    //     ', end: ', ((Math.floor((startIndex + offset) / mult) + layerOffset) + (currentMultiplier * j)));
                    this.instancePositions.subarray(
                        ((Math.floor(startIndex / mult) + layerOffset) + (currentMultiplier * j)) * 3,
                        ((Math.floor((startIndex + offset) / mult) + layerOffset) + (currentMultiplier * j)) * 3)
                        .fill(0);
                    this.instanceScales.subarray(
                        ((Math.floor(startIndex / mult) + layerOffset) + (currentMultiplier * j)) * 3,
                        ((Math.floor((startIndex + offset) / mult) + layerOffset) + (currentMultiplier * j)) * 3)
                        .fill(0);
                    this.instanceColors.subarray(
                        (Math.floor(startIndex / mult) + layerOffset) + (currentMultiplier * j),
                        (Math.floor((startIndex + offset) / mult) + layerOffset) + (currentMultiplier * j))
                        .fill(0);
                }
            } else {
                // console.log(i, 'start: ', (Math.floor(startIndex / mult) + layerOffset),
                //     ', end: ', (Math.floor((startIndex + offset) / mult) + layerOffset));
                this.instancePositions.subarray(
                    (Math.floor(startIndex / mult) + layerOffset) * 3,
                    (Math.floor((startIndex + offset) / mult) + layerOffset) * 3)
                    .fill(0);
                this.instanceScales.subarray(
                    (Math.floor(startIndex / mult) + layerOffset) * 3,
                    (Math.floor((startIndex + offset) / mult) + layerOffset) * 3)
                    .fill(0);
                this.instanceColors.subarray(
                    Math.floor(startIndex / mult) + layerOffset,
                    Math.floor((startIndex + offset) / mult) + layerOffset)
                    .fill(0);
            }
            layerOffset += currentMultiplier;
            currentMultiplier *= this.maxInstancesPerLayer[i + 1];
            mult /= this.maxInstancesPerLayer[i + 1];
            this.instGeom.attributes.instancePosition.needsUpdate = true;
            this.instGeom.attributes.instanceScale.needsUpdate = true;
            this.instGeom.attributes.instanceColorIndex.needsUpdate = true;
        }

    }

    computeTotalInstances(maxInstancesPerLayer, matrixCache) {
        let instances = 0;
        let multiplier = 1;
        for (let i = 0; i < matrixCache.length; i++) {
            if (Array.isArray(matrixCache[i][0])) {
                instances += matrixCache[i].length * maxInstancesPerLayer[i] * multiplier;
            } else {
                instances += maxInstancesPerLayer[i] * multiplier;
            }
            multiplier *= maxInstancesPerLayer[i];
        }
        return instances;
    }

    createMaterial() {
        return new THREE.ShaderMaterial({
            vertexShader: `
                attribute vec3 instancePosition;
                attribute vec3 instanceScale;
                attribute float instanceColorIndex;
                
                uniform vec3 colorArray[32]; // must match maxColors in JS
                
                varying vec3 vColor;
                
                void main() {
                  vec3 transformed = position * instanceScale + instancePosition;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
                
                  int idx = int(instanceColorIndex);
                  vColor = colorArray[idx];
                }
      `,
            fragmentShader: `
            varying vec3 vColor;
            void main() {
              gl_FragColor = vec4(vColor, 1.0);
            }
      `,
            transparent: false
        });
    }

}