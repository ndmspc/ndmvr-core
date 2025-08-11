import RadixCounter from "../utils/radixCounter.js";
import {computeAFrameBinSizePos, rootSizePosToAFrame} from "../utils/histogramRenderUtils.js";
import {HistogramPointerClass} from "../core/histogram-pointer-class.js";
import {functionSubjectGet} from "../rxjs/FunctionSubject.js";
import {filter} from "rxjs";
import {stateSubjectGet} from "../rxjs/StateSubject.js";
import {canvasSubjectGet} from "../rxjs/CanvasSubject.js";

export class NestedHistogram {
    bin_padding_x;
    bin_padding_y;
    bin_padding_z;
    id = undefined;
    sub = undefined;
    stateSub = undefined;

    rootObj = undefined;
    pointer = undefined;
    instancedMesh = undefined;
    maxInstancesPerLayer = undefined;
    maxContentPerLayer = undefined;
    totalInstances = undefined;
    color = new THREE.Color();
    matrixCache = undefined;
    selectedSet = 'unlikepm';
    availableSets = [];
    renderHistory = [];
    mouseEvents = [];
    keydownEvents = [];
    keyupEvents = [];
    // clickEvents = [];
    // mousemoveEvents = [];

    handleStateChange(state) {
        if (state.selectedSet && state.selectedSet !== this.selectedSet) {
            this.selectedSet = state.selectedSet;

            console.log(this.renderHistory);

            const renderHistoryCopy = this.renderHistory;
            this.renderHistory = [];

            renderHistoryCopy.forEach(call => {
                if (call.procedure === 'render') {
                    this.renderHistogram(
                        call.value.startIndex,
                        call.value.endIndex,
                        call.value.layer);
                } else if (call.procedure === 'hide') {
                    this.hideChildHistogram(call.value);
                }
            });
        } else if (state.availableSets && state.availableSets !== this.availableSets) {
            this.availableSets = state.availableSets;
        }
    }

    constructor(bin_padding_x, bin_padding_y, bin_padding_z, histo, id) {
        this.bin_padding_x = bin_padding_x;
        this.bin_padding_y = bin_padding_y;
        this.bin_padding_z = bin_padding_z;
        this.rootObj = histo.histogram;
        this.pointer = new HistogramPointerClass(this.rootObj);
        this.id = id;
        console.log(this.pointer.origin);
        this.setAvailableSets(this.pointer.origin);

        this.sub = functionSubjectGet().getObservable()
            .pipe(filter(e =>
                (e.target.entity === 'nested-histogram') && ((e.target.id.includes('*')) || (e.target.id.includes(this.id)))))
            .subscribe((f) => {
                if (f.flag === 'add') {
                    this.addEvent(f.event, f.function);
                } else if (f.flag === 'remove') {
                    this.removeEvent(f.event, f.function);
                }
            });
        this.handleStateChange = this.handleStateChange.bind(this);
        this.stateSub = stateSubjectGet().getObservable().subscribe(this.handleStateChange);

        this.keyDownHandler = this.keyDownHandler.bind(this);
        this.keyUpHandler = this.keyUpHandler.bind(this);
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keydown', this.keyUpHandler);

    }

    remove() {
        this.matrixCache = [];
        this.instancedMesh.dispose();
        this.instancedMesh.parent.remove(this.instancedMesh);
        this.sub.unsubscribe();
        this.stateSub.unsubscribe();
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keydown', this.keyUpHandler);
    }

    init() {
        this.maxInstancesPerLayer = this.computeMaxInstancesPerLayer();
        this.maxContentPerLayer = this.computeMaxContentPerLayer();
        console.log(this.maxContentPerLayer);
        console.log(this.maxInstancesPerLayer)
        this.matrixCache = new Array(this.maxInstancesPerLayer.length).fill().map(() => []);
        this.totalInstances = this.maxInstancesPerLayer
            .reduce((acc, value) => {
                return acc * value;
            }, 1);

        this.setupInstancedMesh();
    }

    renderHistogram(startIndex, endIndex, layer) {
        if (!this.pointer ||
            layer > this.maxInstancesPerLayer.length - 1) return;
        this.currentLayer = layer;
        // this.logRender(startIndex, endIndex, layer, 'render');
        this.logRender({
            procedure: 'render',
            value: {
                startIndex: startIndex,
                endIndex: endIndex,
                layer: layer
            }
        });
        // console.log(layer)

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

            canvasSubjectGet().next({
                id: this.id + '-cinema',
                obj: obj
            });

            const fXbins = obj.fXaxis.fNbins;
            const fYbins = obj.fYaxis.fNbins;
            const fZbins = obj.fZaxis.fNbins;

            const counter = new RadixCounter([fXbins, fYbins, fZbins]);
            // const contentMax = Math.max(...this.filterOutsideContent(obj));
            const contentMax = this.maxContentPerLayer[currentLayer].content ?
                this.maxContentPerLayer[currentLayer].content :
                this.maxContentPerLayer[currentLayer][this.selectedSet];
            const isTH3 = obj._typename.substring(0, 3) === 'TH3';
            const isTH2 = obj._typename.substring(0, 3) === 'TH2';
            const stepFor = this.maxInstancesPerLayer
                .slice(currentLayer + 1)
                .reduce((acc, value) => {
                    return acc * value;
                }, 1);
            counter.setFromNumber(startIndex / stepFor);
            //console.log(startIndex, endIndex, stepFor, counter.values)

            let padding;
            if (isTH3) {
                padding = {
                    x: this.bin_padding_x,
                    y: this.bin_padding_y,
                    z: this.bin_padding_z,
                };
            } else if (isTH2 || ((startIndex + endIndex) / stepFor) < 10) {
                padding = {
                    x: this.bin_padding_x,
                    y: this.bin_padding_y,
                    // y: 0,
                    z: this.bin_padding_z,
                }
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

                //-------------ODTADIAL---------
                const content = obj.getBinContent(relPos.x + 1, relPos.y + 1, relPos.z + 1);
                let scaleFactor = 1;
                if (currentLayer === 0) {
                    scaleFactor = content / contentMax;
                    // scaleFactor = 0.2 + 0.8 * this.easeOutCubic(content / contentMax);
                } else {
                    scaleFactor = content / contentMax;
                }

                this.color = new THREE.Color(counter.getIndex() / 10, 0, 1 - counter.getIndex() / 10);

                const t = binSizePos.y.size * scaleFactor;

                if (isTH3) {
                    binSizePos.x.size *= scaleFactor;
                    binSizePos.z.size *= scaleFactor;
                    binSizePos.y.size = t;
                } else if (isTH2) {
                    binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
                    binSizePos.y.size = t;
                } else {
                    binSizePos.y.pos -= (binSizePos.y.size - t) / 2;
                    binSizePos.y.size = t;
                    binSizePos.z.size = 0.1;
                }

                this.matrixCache[currentLayer][i / stepFor] = {
                    position: new THREE.Vector3(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos),
                    scale: new THREE.Vector3(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size),
                }

                dummy.position.set(binSizePos.x.pos, binSizePos.y.pos, binSizePos.z.pos)
                dummy.scale.set(binSizePos.x.size, binSizePos.y.size, binSizePos.z.size)
                dummy.updateMatrix();

                if (currentLayer === layer) {
                    this.instancedMesh.setMatrixAt(i, dummy.matrix);
                    this.instancedMesh.setColorAt(i, this.color);
                } else if (this.maxInstancesPerLayer.length - 1 > layer) {
                    const index = obj.getBin(relPos.x + 1, relPos.y + 1, relPos.z + 1)
                    let child = undefined;
                    if (obj.children.content) {
                        child = obj.children.content[index];
                    } else {
                        child = obj.children[this.selectedSet][index];
                    }
                    render(i, endIndex, currentLayer + 1, child, this.matrixCache[currentLayer][i / stepFor]);
                }

                //---------POTADIAL------------
                if (!counter.increment(0)) break;
            }
            this.instancedMesh.instanceMatrix.needsUpdate = true;
            this.instancedMesh.instanceColor.needsUpdate = true;

        }

        render(startIndex, endIndex, 0, this.pointer.origin, matrix);
        this.instancedMesh.computeBoundingBox();
    }

    setupInstancedMesh() {
        let parent = undefined;
        if (this.instancedMesh) {
            parent = this.instancedMesh.parent;
            this.instancedMesh.parent.remove(this.instancedMesh);
            this.instancedMesh.dispose();
        }

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({color: 0xaaaaaa});
        // const material = new THREE.MeshMatcapMaterial({color: 0xaaaaaa});

        let totalInst = this.maxInstancesPerLayer
            .reduce((acc, value) => {
                return acc * value;
            }, 1);
        if (this.availableSets > 1) {
            totalInst += this.maxInstancesPerLayer[-2] * (this.availableSets - 1)
        }

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, totalInst);
        const dummy = new THREE.Object3D();
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        for (let i = 0; i < totalInst; i++) {
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        // this.instancedMesh.frustrumCulled = false
        this.instancedMesh.frustumCulled = false;
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        this.instancedMesh.raycast = (raycaster, intersects) => {
            const res = this.checkIntersection(raycaster.ray);
            if (res[0]) {
                const triggerSource = raycaster._triggerSource;
                this.mouseEvents
                    .filter(mouseEvent => mouseEvent.event === triggerSource)
                    .forEach(mouseEvent => mouseEvent.function(res[0].index, this));
            }
        }
        if (parent) {
            parent.add(this.instancedMesh);
        }
    }

    addEvent(event, func) {
        if (event?.state === 'keydown') {
            this.keydownEvents.push({
                key: event.key,
                function: func
            });
            console.log('down');
        } else if (event?.state === 'keyup') {
            this.keyupEvents.push({
                key: event.key,
                function: func
            });
        } else {
            this.mouseEvents.push({
                event: event,
                function: func
            });
        }
    }

    removeEvent(event, func) {
        const index = this.mouseEvents.find((f) => f === func);
        if (index) this.mouseEvents.splice(index, 1);
    }

    computeIndexFromPosition(position) {
        let ind = Array(position.length).fill(0);
        const rec = (layer, obj, index) => {
            const fX = obj.fXaxis.fNbins;
            const fY = obj.fYaxis.fNbins;
            const fZ = obj.fZaxis.fNbins;
            // console.log(this.maxInstancesPerLayer)
            const t = this.maxInstancesPerLayer
                .slice(-this.maxInstancesPerLayer.length + layer + 1);
            // console.log(t)
            const multiplier = t
                .reduce((acc, value) => {
                    return acc * value;
                }, 1);
            // console.log(multiplier)
            ind[index] += (position[layer].x + (position[layer].y * fX) + (position[layer].z * fX * fY)) * multiplier;
            if (layer + 1 < position.length) {
                let child = undefined;
                if (obj.children.content) {
                    child = obj.children.content[obj.getBin(position[layer].x + 1, position[layer].y + 1, position[layer].z + 1)];
                } else {
                    child = obj.children[this.selectedSet][obj.getBin(position[layer].x + 1, position[layer].y + 1, position[layer].z + 1)];
                }
                if (index > layer) {
                    rec(layer + 1, child, index);
                }
            }
        }
        for (let i = 0; i < position.length; i++) {
            rec(0, this.pointer.origin, i);
        }

        return ind;
    }

    computeJsRootIndexFromPosition(position) {
        let ind = Array(position.length).fill(0);
        let t = this.pointer.origin;
        for (let i = 0; i < position.length; i++) {
            ind[i] = t.getBin(position[i].x + 1, position[i].y + 1, position[i].z + 1);
            if (t.children.content) {
                t = t.children.content[ind[i]];
            } else {
                return ind;
            }
        }
        return ind;
    }

    setPointerToChild(index, set) {
        this.pointer.setOriginToChild(index, set);
        this.init();
        console.log('path: ', this.pointer.path);
        console.log('title: ', this.pointer.title)
        this.renderHistogram(0, this.totalInstances, 0);
    }

    setPointerToParent() {
        this.pointer.setOriginToParent(1);
        console.log('path: ', this.pointer.path);
        console.log('title: ', this.pointer.title)
        this.init();
        this.renderHistogram(0, this.totalInstances, 0);
    }

    showChildHistogram(position) {
        const ind = this.computeIndexFromPosition(position);

        const t = this.maxInstancesPerLayer
            .slice(-this.maxInstancesPerLayer.length + position.length);
        const multiplier = t
            .reduce((acc, value) => {
                return acc * value;
            }, 1);
        this.renderHistogram(ind.slice(-1)[0], ind.slice(-1)[0] + multiplier, position.length);
    }

    hideChildHistogram(index) {
        if (index.length === 1) return;

        const layerDimensions = this.maxInstancesPerLayer.slice(index.length - 1);
        const cacheLayerDimensions = this.maxInstancesPerLayer.slice(
            index.length - 1,
            this.maxInstancesPerLayer.length - 1
        );

        const totalMultiplier = layerDimensions.reduce((acc, value) => acc * value, 1);

        const startIndex = this.calculateHierarchicalIndex(index);
        const startIndexFloored = Math.floor(startIndex / totalMultiplier) * totalMultiplier;

        this.clearMatrixCacheRange(startIndexFloored, totalMultiplier, cacheLayerDimensions, index.length - 1);
        this.hideInstanceRange(startIndexFloored, totalMultiplier);
        this.logRender({
            procedure: 'hide',
            value: index
        });
        this.renderHistogram(startIndexFloored, startIndexFloored + totalMultiplier, index.length - 2);
        this.renderHistory.pop(); //removes duplicit renderHistogram call
    }

    calculateHierarchicalIndex(index) {
        let calculatedIndex = 0;
        const layerSizes = this.maxInstancesPerLayer.slice(1);
        const multipliers = [];

        for (let i = 0; i < layerSizes.length; i++) {
            const multiplier = layerSizes.slice(i).reduce((acc, value) => acc * value, 1);
            multipliers.push(multiplier);
        }

        const traverse = (layer, obj) => {
            const {fNbins: fX} = obj.fXaxis;
            const {fNbins: fY} = obj.fYaxis;
            const {fNbins: fZ} = obj.fZaxis;

            const linearIndex = index[layer].x +
                (index[layer].y * fX) +
                (index[layer].z * fX * fY);

            calculatedIndex += linearIndex * multipliers[layer];

            if (layer + 1 < index.length) {
                const child = this.getChildObject(obj, index[layer]);
                traverse(layer + 1, child);
            }
        };

        traverse(0, this.pointer.origin);
        return calculatedIndex;
    }

    getChildObject(obj, indexLayer) {
        const binIndex = obj.getBin(indexLayer.x + 1, indexLayer.y + 1, indexLayer.z + 1);

        if (obj.children.content) {
            return obj.children.content[binIndex];
        } else {
            return obj.children[this.selectedSet][binIndex];
        }
    }

    clearMatrixCacheRange(startIndex, multiplier, dimensions, baseLayerIndex) {
        let currentIndex = startIndex;
        let currentMultiplier = multiplier;

        for (let i = baseLayerIndex + dimensions.length - 1; i >= baseLayerIndex; i--) {
            this.matrixCache[i].fill(null, currentIndex, currentIndex + currentMultiplier);

            if (i > baseLayerIndex) {
                currentIndex /= dimensions[i - baseLayerIndex];
                currentMultiplier /= dimensions[i - baseLayerIndex];
            }
        }
    }

    setAvailableSets(origin) {
        if (origin.children.content) {
            const firstChild = origin.children.content.find((child) => {return child});
            this.setAvailableSets(firstChild);
        } else if (origin.children) {
            const currentValue = stateSubjectGet().getValue();
            currentValue.sets = Object.keys(origin.children);
            stateSubjectGet().next(currentValue);
        }
    }

    keyDownHandler(event) {
        // console.log(this.keydownEvents);
        const regex = /^(?:Digit|Numpad)(\d+)$/;
        const match = event.code.match(regex);

        if (match) {
            const dummy = new THREE.Object3D();
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            for (let i = 0; i < this.totalInstances; i++) {
                this.instancedMesh.setMatrixAt(i, dummy.matrix);
            }
            this.matrixCache = new Array(this.maxInstancesPerLayer.length).fill().map(() => []);

            this.renderHistogram(0, this.totalInstances, parseInt(match[1]) - 1);
        }
    }

    keyUpHandler(event) {
        // console.log(event);
    }

    logRender(obj) {
        if (obj.procedure === 'render') {
            if (obj.value.startIndex === 0 && obj.value.endIndex === this.totalInstances) {
                this.renderHistory = [];
            }
        }
        this.renderHistory.push(obj);
    }

    hideInstanceRange(startIndex, count) {
        const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

        for (let i = startIndex; i < startIndex + count; i++) {
            this.instancedMesh.setMatrixAt(i, hiddenMatrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    checkIntersection(ray) {
        // console.log('inter');
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
            // console.log(layer, node, offset)

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
                        // console.log(layer, node, x)
                        const xIndex = x.array[0];
                        const fullPath = [...path, {x: xIndex, y: yIndex, z: zIndex}];
                        const binIndex = node.getBin(xIndex + 1, yIndex + 1, zIndex + 1);
                        let children = undefined;
                        if (node.children?.content) {
                            children = node.children.content;
                        } else {
                            children = node.children?.[this.selectedSet];
                        }
                        // const children = node.children?.[this.selectedChildren];
                        const child = children?.[binIndex];

                        // const dummy = new THREE.Object3D();
                        // this.instancedMesh.getMatrixAt(
                        //    ((xIndex + (yIndex * fX) + (zIndex * fX * fY)) * perInstance) + this.maxInstancesPerLayer[layer+2],
                        //    dummy.matrix);
                        // dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                        // console.log('decompose')
                        const childOffset = (offset * perInstance) + ((xIndex + (yIndex * fX) + (zIndex * (fX * fY))) * perInstance);

                        // const next = this.matrixCache[layer + 1][childOffset + this.maxInstancesPerLayer[layer + 2]]
                        const next = this.matrixCache[layer + 1][childOffset]

                        // console.log(node)
                        if (child && next) {
                            const nextLayer = layer + 1;
                            // console.log(childOffset)
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

        return recursiveSearch(this.pointer.origin, 0);
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

    computeMaxContentPerLayer() {
        if (!this.pointer) return;

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

        max[0] = { content: getMax(this.pointer.origin.fArray) };

        const computation = (children, layer = 1) => {
            if (!max[layer]) {
                max[layer] = {};
            }

            Object.entries(children).forEach(([key, childArray]) => {
                childArray.forEach(child => {
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

        if (this.pointer.origin.children) {
            computation(this.pointer.origin.children);
        }

        return max;
    }


    computeMaxInstancesPerLayer() {
        if (!this.pointer) return;
        const temp = this.pointer.origin.fXaxis.fNbins * this.pointer.origin.fYaxis.fNbins * this.pointer.origin.fZaxis.fNbins;
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
        if (this.pointer.origin.children) {
            computation(this.pointer.origin.children);
        }
        max.push(1)
        return max;
    }
}