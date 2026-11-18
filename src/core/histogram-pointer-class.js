import { areAvailableAxesEqual, cropJSROOTHistogram, } from "../utils/histogramUtils.js";

export class HistogramPointerClass {

  rootObj = undefined;
  origin = undefined;
  parentPath = [];
  path = undefined;
  title = undefined;
  range = [];
  isOnSet = null;
  isHistogramFilled = true;
  axisRanges = undefined;

  constructor(rootObj) {
    this.rootObj = rootObj;
    this.origin = this.rootObj;
    this.title = this.origin.fTitle;
    this.path = this.origin.fName;
  }

  /**
   * sets origin of pointer to one of child's.
   * @param index is an index in child mapping.
   * @param set if children contains sets, parameter need to be specified.
   * */
  setOriginToChild(index, set, range) {
    // console.log('vojde', this.origin, ', set: ', set);
    if (!index) return;
    // console.log(index)
    const currentIndex = index.splice(0, 1);
    if (!this.origin?.children) return;
    if (this.origin.children?.content) {
      this.parentPath.push({origin: this.origin, range: range.splice(0, 1), bin: currentIndex, set: null});
      this.origin = this.origin.children.content[currentIndex];
      this.isOnSet = null;
      if (!this.origin) {
        this.isHistogramFilled = false;
        this.path = this.path + "/empty";
        return;
      }
    } else if (Object.keys(this.origin.children).includes(set)) {
      this.parentPath.push({origin: this.origin, range: range.splice(0, 1), bin: currentIndex, set});
      if (!this.origin.children[set][currentIndex]) {
        this.isHistogramFilled = false;
        this.path = this.path + "/empty";
        this.origin = null;
        return;
      }
      this.origin = this.origin.children[set][currentIndex];
      this.isOnSet = set;
    } else {
      console.error("Bad set or index specified.");
      return;
    }
    // console.log(this.origin)
    this.title = this.origin.fTitle;
    this.path = this.path + "/" + this.origin.fName;
    if (index.length > 0) {
      this.setOriginToChild(index, set, range);
    }
  }

  /**
   * Method to get child (jsroot object) by position
   * @warning for @param position only supply shallow copy of value,
   * @note Index have to exclude first index as the pointer is already on this node.
   * as if deep copy is supplied, the original is rewritten.
   * @param node Defines origin from which child set by position is obtained.
   * @param index Defines index specified by jsroot indexing of bins.
   * @param set Defines set from which histogram will be choosen, if possible.
   * Has to be array (can go through more layers at once) where each entry represents children position in layer.
   * */
  /**
   * */
  getChildByPosition(index, set, node = this.origin) {
    if (!index || index.length === 0) return {...node};
    const currentIndex = index.splice(0,1)[0];
    if (!node?.children) return {...node};
    if (node.children?.content) {
      return this.getChildByPosition(index, set, node.children.content[currentIndex]);
    } else if (Object.keys(node.children).includes(set)) {
      return this.getChildByPosition(index, set, node.children[set][currentIndex]);
    } else {
      console.error("Bad set or index specified.");
      return null;
    }
  }

  /**
   * sets origin of pointer to one of parent nodes.
   * @param steps (optional, default = 1) defines how many steps in path should pointer go upwards.
   * */
  setOriginToParent(steps = 1) {
    if (steps <= 0 || this.parentPath.length === 0) return;
    const pathIndex = this.path.lastIndexOf("/");
    this.path = this.path.slice(0, pathIndex);
    const parent = this.parentPath.pop();
    if (parent) {
      this.origin = parent.origin;
    }
    this.title = this.origin.fTitle;
    this.setOriginToParent(steps - 1);
    this.isOnSet = null;
    this.isHistogramFilled = true;
  }

  setHistogramRanges(ranges) {
    if (areAvailableAxesEqual(ranges, this.axisRanges)) return;
    this.axisRanges = ranges;

    this.origin = cropJSROOTHistogram(this.rootObj, ranges);
  }

  /**
   * The drill path this pointer stands on, as plain data: the bin indices it walked down and the set each
   * step went through.
   *
   * A pointer cannot survive its histogram (a new object means a new pointer), so the path is taken off it
   * first and handed to {@link pathTo} when the histogram is built again — which is what keeps a reader on
   * the level they were looking at instead of dropping them back to the root.
   *
   * @return One entry per level walked down, shallowest first. Empty at the root.
   */
  exportPath() {
    return this.parentPath.map((step) => ({ bin: step.bin?.[0], set: step.set ?? null }));
  }

  /**
   * Walk this pointer back down to a path {@link exportPath} produced.
   *
   * The object it walks is the new one, so a step the new tree does not have is where the walk stops: the
   * closest level that still exists is the one the reader is shown, rather than a level below it that would
   * read as empty.
   *
   * @param path Entries from {@link exportPath}.
   * @return Whether the whole path was walked (false when the new tree is shallower).
   */
  pathTo(path) {
    if (!path?.length) return true;
    for (const step of path) {
      const bin = step.bin;
      if (bin === undefined || bin === null) return false;
      const before = this.origin;
      const beforePath = this.parentPath.length;
      this.setOriginToChild([bin], step.set, []);
      if (this.parentPath.length === beforePath || this.origin === before) return false;
      if (!this.isHistogramFilled) return false;
    }
    return true;
  }

}
