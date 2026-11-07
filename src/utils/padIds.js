/**
 * The ids of the pads a `histogramPads` configuration describes.
 *
 * Kept on its own, with no configuration import of its own, so the rule can be tested directly: the
 * subject hands in the **parsed** configuration, where a grid recipe (`grid2x2x1`) is already the pads
 * it expands to and an explicit array is passed through as written.
 */
export function histogramPadIdsOf(pads) {
  if (!Array.isArray(pads)) return [];
  return pads.map(pad => pad?.id).filter(id => typeof id === "string" && id !== "");
}
