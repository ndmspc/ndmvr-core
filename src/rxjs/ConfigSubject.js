import {BehaviorSubject} from "rxjs";

let configSubject;

class ConfigSubject {

    #subject;

    constructor() {
        this.#subject = new BehaviorSubject({
            target: {
                entity: 'nested-histogram',
                id: '*'
            },
            config: {
                histogramPads:
                    [{
                        id: "histo1",
                        position: new THREE.Vector3(0, 0, 0),
                        scale: new THREE.Vector3(10, 5, 10),
                    }, {
                        id: "histo2",
                        position: new THREE.Vector3(0, 0, 0),
                        scale: new THREE.Vector3(10, 5, 10),
                    }],
                canvas: {
                    position: {x: 0, y: 5, z: -15},
                    rotation: {x: 10, y: 0, z: 0},
                    scale: {x: 10, y: 10, z: 0}
                },
                padding: {
                    default: {
                        x: 0.1, y: 0.1, z: 0.1
                    },
                    layer: [
                        {x: 0.1, y: 0.1, z: 0.1},
                    ]
                },
                TH1ZScale: {
                    default: 0.8,
                    layer: [0.2, 1, 1, 1]
                },
                wireframe: {
                    display: {
                        start: 0,
                        end: 5
                    },
                    displaySets: false,
                    layer: [],
                    color: {
                        default: "0x000000",
                        layer: [],
                        set: []
                    }
                },
                color: {
                    default: {
                        min: new THREE.Color(0x0000ff),
                        max: new THREE.Color(0xff0000),
                    },
                    layer: [],
                    set: [
                        {
                            min: new THREE.Color(0x222222),
                            max: new THREE.Color(0xffaa00),
                        },
                        {
                            min: new THREE.Color(0x00ffff),
                            max: new THREE.Color(0xff7f00),
                        },
                        {
                            min: new THREE.Color(0x00ff00),
                            max: new THREE.Color(0x800080),
                        },
                        {
                            min: new THREE.Color(0x0000ff),
                            max: new THREE.Color(0xff0000),
                        }
                    ]
                }
            }
        })
    }

    getObservable() {
        return this.#subject.asObservable();
    }

    getValue() {
        return this.#subject.getValue();
    }

    next(e) {
        // console.log(this.parseConfig(e));
        this.#subject.next(this.parseConfig(e));
    }

    parseConfig(json) {
        const data = typeof json === "string" ? JSON.parse(json) : json;

        function expandHistogramPads(pads) {
            // If already array → return transformed version
            if (Array.isArray(pads)) return pads;

            // If object with "type" → expand into array
            if (pads && typeof pads === "object" && "type" in pads) {
                const match = pads.type.match(/grid(\d+)x(\d+)x(\d+)/);
                if (!match) return [pads]; // fallback

                const nx = parseInt(match[1], 10);
                const ny = parseInt(match[2], 10);
                const nz = parseInt(match[3], 10);

                const scale = pads.scale || { x: 1, y: 1, z: 1 };
                const padding = pads.padding || { x: 0, y: 0, z: 0 };
                const origin = pads.origin || { x: 0, y: 0, z: 0 };

                const result = [];
                let counter = 1;

                for (let ix = 0; ix < nx; ix++) {
                    for (let iy = 0; iy < ny; iy++) {
                        for (let iz = 0; iz < nz; iz++) {
                            result.push({
                                id: `histogram${counter++}`,
                                position: {
                                    x: origin.x + ((ix - (nx - 1) / 2) * (scale.x + padding.x)),
                                    y: origin.y + ((iy - (ny - 1) / 2) * (scale.y + padding.y)),
                                    z: origin.z + ((iz - (nz - 1) / 2) * (scale.z + padding.z))
                                },
                                scale: { ...scale }
                            });
                        }
                    }
                }

                return result;
            }

            // Otherwise → single object, wrap in array
            return [pads];
        }

        function transform(obj, key = null) {
            if (Array.isArray(obj)) {
                return obj.map(o => transform(o, key));
            } else if (obj && typeof obj === "object") {
                // Special case for histogramPads
                if (key === "histogramPads") {
                    return expandHistogramPads(obj).map(pad => transform(pad));
                }

                // Check for {x,y,z}
                if ("x" in obj && "y" in obj && "z" in obj && Object.keys(obj).length === 3) {
                    return new THREE.Vector3(obj.x, obj.y, obj.z);
                }

                const result = {};
                for (const k in obj) {
                    result[k] = transform(obj[k], k);
                }

                // inject default target if missing
                if (!("target" in result)) {
                    result.target = { entity: "*", id: "*" };
                }

                return result;
            } else if (typeof obj === "string" && obj.startsWith("0x")) {
                return new THREE.Color(parseInt(obj));
            } else {
                return obj;
            }
        }

        return transform(data);
    }


}

export const configSubjectGet = () => {
    if (!configSubject) configSubject = new ConfigSubject();
    return configSubject;
}