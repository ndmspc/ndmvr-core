// Dispose only resources owned by the supplied subtree, not its parent or scene.
export function disposeObject3D(object, disposed = new Set()) {
  if (!object || disposed.has(object)) return;
  disposed.add(object);

  object.removeFromParent?.();
  if (object.parent) object.parent.remove?.(object);
  for (const child of [...(object.children ?? [])]) {
    disposeObject3D(child, disposed);
  }
  object.clear?.();
  if (object.children) object.children.length = 0;

  const disposeResource = resource => {
    if (!resource || disposed.has(resource)) return;
    disposed.add(resource);
    resource.dispose?.();
  };

  // JSROOT instanced meshes also own renderer buffers beyond their geometry.
  if (object.isInstancedMesh && object.geometry) object.dispose?.();

  // Three.js Sprite instances share a geometry owned by the library.
  if (!object.isSprite) disposeResource(object.geometry);
  object.geometry = undefined;

  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    if (!material || disposed.has(material)) continue;
    for (const value of Object.values(material)) {
      if (value?.isTexture) disposeResource(value);
    }
    disposeResource(material);
  }
  object.material = undefined;
}
