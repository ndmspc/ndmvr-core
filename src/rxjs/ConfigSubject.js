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
                histogramMatrix: {
                    position: new THREE.Vector3(0, 0, 0),
                    scale: new THREE.Vector3(10, 5, 10)
                },
                jsrootHistogramMatrix: {
                    position: new THREE.Vector3(0, 0, -20),
                    scale: new THREE.Vector3(1, 1, 1)
                },
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
        this.#subject.next(this.parseConfig(e));
    }

    parseConfig(json) {
        const data = typeof json === "string" ? JSON.parse(json) : json;

        function transform(obj) {
            if (Array.isArray(obj)) {
                return obj.map(transform);
            } else if (obj && typeof obj === "object") {
                // check for {x, y, z}
                if ("x" in obj && "y" in obj && "z" in obj && Object.keys(obj).length === 3) {
                    return new THREE.Vector3(obj.x, obj.y, obj.z);
                }

                const result = {};
                for (const key in obj) {
                    result[key] = transform(obj[key]);
                }

                // inject default target if missing
                if (!("target" in result)) {
                    result.target = {
                        entity: "*",
                        id: "*"
                    };
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