export default class HistogramWireframeClass {

    wireframe = undefined;
    instGeom = undefined;
    material = undefined;
    totalInstances = undefined;
    maxInstancesPerLayer = undefined;
    instancePositions = undefined;
    instanceScales = undefined;

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
        this.instancePositions = new Float32Array(this.totalInstances * 3);
        this.instanceScales = new Float32Array(this.totalInstances * 3);
        console.log(this.instancePositions);

        this.instGeom.setAttribute(
            "instancePosition",
            new THREE.InstancedBufferAttribute(this.instancePositions, 3)
        );
        this.instGeom.setAttribute(
            "instanceScale",
            new THREE.InstancedBufferAttribute(this.instanceScales, 3)
        );

        this.wireframe = new THREE.LineSegments(this.instGeom, this.material);
        this.wireframe.frustumCulled = false;

        console.log(maxInstancesPerLayer);
        console.log(matrixCache);

        console.log(this.computeTotalInstances(maxInstancesPerLayer, matrixCache));
    }

    setInstance(index, position, scale) {
        this.instancePositions.set([position.x, position.y, position.z], index * 3);
        this.instanceScales.set([scale.x, scale.y, scale.z], index * 3);
    }

    render(matrixCache, startLayer, endLayer, startIndex, endIndex) {
        let offset = 0;

        for (let i = startLayer; i < endLayer; i++) {
            const stepFor = this.maxInstancesPerLayer
                .slice(i + 1)
                .reduce((acc, value) => {
                    return acc * value;
                }, 1);

            const start = startIndex / stepFor;
            const n = (endIndex - startIndex) / stepFor;

            for (let j = start; j < start + n; j++) {
                const inst = matrixCache[i][j];
                this.setInstance(offset + j, inst.position, inst.scale);
            }
            offset += matrixCache[i].length;
        }

        this.instGeom.attributes.instancePosition.needsUpdate = true;
        this.instGeom.attributes.instanceScale.needsUpdate = true;
        console.log(this.instancePositions);
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
                
                void main() {
                  vec3 transformed = position * instanceScale + instancePosition;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
                }
      `,
            fragmentShader: `
        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        }
      `,
            transparent: false
        });
    }

}