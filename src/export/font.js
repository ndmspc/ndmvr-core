// Single-stroke (Hershey-style) font, drawn on a 4 x 6 grid per glyph.
const G = (value) =>
  value.split("|").map((line) =>
    line.split(" ").map((pair) => pair.split(",").map(Number)),
  );

const GLYPHS = {
  " ": G(""),
  "0": G("0,1 2,0 4,1 4,5 2,6 0,5 0,1"),
  "1": G("1,5 2,6 2,0|1,0 3,0"),
  "2": G("0,5 2,6 4,5 4,4 0,0 4,0"),
  "3": G("0,5 2,6 4,5 4,4 2,3|2,3 4,2 4,1 2,0 0,1"),
  "4": G("3,0 3,6|3,6 0,2 4,2"),
  "5": G("4,6 0,6 0,3 2,4 4,3 4,1 2,0 0,1"),
  "6": G("4,5 2,6 0,5 0,1 2,0 4,1 4,3 2,4 0,3"),
  "7": G("0,6 4,6 1,0"),
  "8": G("2,3 0,4 0,5 2,6 4,5 4,4 2,3 0,2 0,1 2,0 4,1 4,2 2,3"),
  "9": G("0,1 2,0 4,1 4,5 2,6 0,5 0,3 2,2 4,3"),
  "A": G("0,0 0,4 2,6 4,4 4,0|0,2 4,2"),
  "B": G("0,0 0,6 3,6 4,5 4,4 3,3 0,3|3,3 4,2 4,1 3,0 0,0"),
  "C": G("4,5 2,6 0,5 0,1 2,0 4,1"),
  "D": G("0,0 0,6 2,6 4,4 4,2 2,0 0,0"),
  "E": G("4,6 0,6 0,0 4,0|0,3 3,3"),
  "F": G("4,6 0,6 0,0|0,3 3,3"),
  "G": G("4,5 2,6 0,5 0,1 2,0 4,1 4,3 2,3"),
  "H": G("0,0 0,6|4,0 4,6|0,3 4,3"),
  "I": G("1,6 3,6|2,6 2,0|1,0 3,0"),
  "J": G("4,6 4,1 2,0 0,1"),
  "K": G("0,0 0,6|4,6 0,3 4,0"),
  "L": G("0,6 0,0 4,0"),
  "M": G("0,0 0,6 2,3 4,6 4,0"),
  "N": G("0,0 0,6 4,0 4,6"),
  "O": G("0,1 0,5 2,6 4,5 4,1 2,0 0,1"),
  "P": G("0,0 0,6 3,6 4,5 4,4 3,3 0,3"),
  "Q": G("0,1 0,5 2,6 4,5 4,1 2,0 0,1|2,2 4,0"),
  "R": G("0,0 0,6 3,6 4,5 4,4 3,3 0,3|2,3 4,0"),
  "S": G("4,5 2,6 0,5 0,4 2,3 4,2 4,1 2,0 0,1"),
  "T": G("0,6 4,6|2,6 2,0"),
  "U": G("0,6 0,1 2,0 4,1 4,6"),
  "V": G("0,6 2,0 4,6"),
  "W": G("0,6 1,0 2,3 3,0 4,6"),
  "X": G("0,0 4,6|0,6 4,0"),
  "Y": G("0,6 2,3 4,6|2,3 2,0"),
  "Z": G("0,6 4,6 0,0 4,0"),
  ".": G("1,0 2,0 2,1 1,1 1,0"),
  ",": G("2,1 1,0"),
  "-": G("1,3 3,3"),
  "+": G("2,1 2,5|0,3 4,3"),
  ":": G("2,1 2,2|2,4 2,5"),
  "=": G("0,2 4,2|0,4 4,4"),
  "/": G("0,0 4,6"),
  "%": G("0,0 4,6"),
  "(": G("3,6 1,4 1,2 3,0"),
  ")": G("1,6 3,4 3,2 1,0"),
  "_": G("0,0 4,0"),
  "?": G("0,5 2,6 4,5 4,4 2,3 2,2|2,0 2,1"),
};

export const GLYPH_WIDTH = 4;
export const GLYPH_HEIGHT = 6;
export const GLYPH_ADVANCE = 6;
export const LINE_STRIDE = 8;

/**
 * Turns text into polylines in mm. Only uppercase letters, digits and a few symbols exist; other
 * characters fall back to "?" and everything is upper-cased.
 */
export function layoutText(text, { charHeightMm = 4, paddingMm = 2, mirror = false } = {}) {
  const scale = charHeightMm / GLYPH_HEIGHT;
  const lines = String(text ?? "").split("\n");
  const polylines = [];
  let maxUnits = 0;

  lines.forEach((line, lineIndex) => {
    const upper = line.toUpperCase();
    for (let index = 0; index < upper.length; index++) {
      const glyph = GLYPHS[upper[index]] ?? GLYPHS["?"];
      for (const polyline of glyph) {
        polylines.push(
          polyline.map(([x, y]) => [
            paddingMm + (index * GLYPH_ADVANCE + x) * scale,
            paddingMm + ((lines.length - 1 - lineIndex) * LINE_STRIDE + y) * scale,
          ]),
        );
      }
    }
    const units = upper.length > 0 ? upper.length * GLYPH_ADVANCE - (GLYPH_ADVANCE - GLYPH_WIDTH) : 0;
    if (units > maxUnits) maxUnits = units;
  });

  const widthMm = paddingMm * 2 + maxUnits * scale;
  const heightMm = paddingMm * 2 + ((lines.length - 1) * LINE_STRIDE + GLYPH_HEIGHT) * scale;
  const placed = mirror
    ? polylines.map((polyline) => polyline.map(([x, y]) => [widthMm - x, y]))
    : polylines;

  return {
    polylines: placed,
    widthMm,
    heightMm,
    scale,
    lineCount: lines.length,
  };
}
