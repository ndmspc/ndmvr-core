export class CanvasClass {

    plane = undefined;
    _planePromise = undefined;

    constructor(image, position, rotation, scale) {
        this._planePromise = this.loadTexture(image, position, rotation, scale);
    }

    loadTexture(image, position, rotation, scale) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                image,
                texture => {
                    const geometry = new THREE.PlaneGeometry(scale.x, scale.y);
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.DoubleSide
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(position.x, position.y, position.z);
                    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
                    resolve(mesh);
                },
                undefined,
                reject
            );
        });
    }

    update(position, rotation) {
        if (this.plane) {
            this.plane.position.set(position.x, position.y, position.z);
            this.plane.rotation.set(rotation.x, rotation.y, rotation.z);
        } else {
            console.warn('Plane is not initialized yet.');
        }
    }

    getPlane() {
        return this._planePromise;
    }
}
