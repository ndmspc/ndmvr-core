import * as THREE from "three";
import { canvasSubjectGet } from "../rxjs/CanvasSubject.js";

/**
 * Class to visualize bin information as a 3D panel in THREE.js
 * Uses pure THREE.js objects and TLatex for text rendering
 * Subscribes to RxJS subject for bin data updates
 */
export class BinInfoVisualizer {
  constructor (camera ,binInfoSubject, create, create3d, options = {}) {
    // Configuration
    this.camera = camera;
    this.options = {
      backgroundColor: 0xAAAAAA,
      textColor: 1, // ROOT color index
      titleColor: 0, // ROOT color index for title
      padding: 0.002,
      lineHeight: 0.002,
      textSize: 0.3,
      width: 0.031,
      ...options
    };

    // Store create functions
    this.create = create;
    this.create3d = create3d;

    // THREE.js group to hold the visualization
    this.group = new THREE.Group();

    // Current bin data
    this.currentData = null;

    // Subscribe to the bin info subject
    this.subscription = canvasSubjectGet()
      .getObservable()
      .subscribe((event) => {
        this.updateVisualization(event);
      });

  }

  /**
   * Parse bin data and extract display information
   */
  parseData (data) {
    const lines = [];

    // Add title if it exists
    if (data.title) {
      lines.push({ text: data.title, isTitle: true });
    }

    // Parse coordinates
    if (data.coords && Array.isArray(data.coords)) {
      data.coords.forEach(coord => {
        Object.entries(coord).forEach(([key, value]) => {
          if (value && typeof value === "object") {
            const rangeText = `${key} = [${value.min.toFixed(2)}, ${value.max.toFixed(2)})`;
            lines.push({ text: rangeText, isTitle: false });
          }
        });
      });
    }

    // Parse index
    if (data.index && Array.isArray(data.index)) {
      data.index.forEach(index => {
        let rangeText = `bin = ${data.object.bins[data.instanceId]}`;
        Object.entries(index).forEach(([key, value]) => {
          rangeText += `, ${key}: ${value}`;
        });
        lines.push({ text: rangeText, isTitle: false });
      });
    }

    // Add content value
    if (data.content !== undefined) {
      const contentText = Number.isInteger(data.content)
        ? `content = ${data.content}`
        : `content = ${data.content.toFixed(2)}`;
      lines.push({ text: contentText, isTitle: false });
    }

    // Add error value if it exists
    if (data.error !== undefined) {
      const errorText = Number.isInteger(data.error)
        ? `error = ${data.error}`
        : `error = ${data.error.toFixed(2)}`;
      lines.push({ text: errorText, isTitle: false });
    }

    return lines;
  }

  /**
   * Create background panel
   */
  createBackgroundPanel (height) {
    const { width, backgroundColor } = this.options;

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: backgroundColor,
      side: THREE.DoubleSide
    });

    const panel = new THREE.Mesh(geometry, material);
    return panel;
  }

  /**
   * Update the 3D visualization
   */
  async updateVisualization (data) {
    this.currentData = data;

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.group.remove(child);
    }

    const lines = this.parseData(data);

    if (lines.length === 0) return;

    const { padding, lineHeight, textSize, textColor, titleColor, width } = this.options;

    const panelHeight = lines.length * lineHeight + padding * 2;

    const panel = this.createBackgroundPanel(panelHeight);
    this.group.add(panel);

    const startY = (panelHeight / 2) - padding - (lineHeight / 2);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const y = startY - (i * lineHeight);

      try {
        const latex = this.create("TLatex");
        latex.fTitle = line.text;
        latex.fTextAlign = 12;
        latex.fTextFont = 2;
        latex.fTitleFont = 2;
        latex.fLabelFont = 2;
        latex.fTextColor = line.isTitle ? titleColor : textColor;
        latex.fTextSize = line.isTitle ? textSize + 2 : textSize;

        const textGroup = await this.create3d(latex, "p", y * 100, "", "");
        textGroup.scale.set(0.00016, 0.00016, 0.00016);

        textGroup.position.x = -(width / 2) + padding;
        textGroup.position.y = y;
        textGroup.position.z = 0.001;

        this.group.add(textGroup);

      } catch (error) {
        console.error("Error creating text line:", error);
      }
    }
    const worldPos = new THREE.Vector3(data.point.x, data.point.y, data.point.z);
    this.camera.worldToLocal(worldPos);
    const dir = new THREE.Vector3()
      .subVectors(worldPos, this.camera.position)
      .normalize();
    const distance = 0.1;

    const pos = new THREE.Vector3()
      .copy(this.camera.position)
      .addScaledVector(dir, distance);

    const box = new THREE.Box3().setFromObject(this.group);
    const size = new THREE.Vector3();
    box.getSize(size);

    const halfSize = size.clone().multiplyScalar(0.5);

    pos.add(new THREE.Vector3(halfSize.x, halfSize.y, 0));
    this.group.position.copy(pos);

    this.camera.add(this.group);
  }

  /**
   * Get the THREE.Group containing the visualization
   */
  getGroup () {
    return this.group;
  }

  /**
   * Set position of the info panel
   */
  setPosition (x, y, z) {
    this.group.position.set(x, y, z);
  }

  /**
   * Set rotation of the info panel
   */
  setRotation (x, y, z) {
    this.group.rotation.set(x, y, z);
  }

  /**
   * Clean up resources
   */
  dispose () {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.group.remove(child);
    }
  }
}

export default BinInfoVisualizer;