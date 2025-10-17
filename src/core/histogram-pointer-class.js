export class HistogramPointerClass {

  rootObj = undefined;
  origin = undefined;
  parentPath = [];
  path = undefined;
  title = undefined;
  range = [];
  isOnSet = false;

  constructor (rootObj) {
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
  setOriginToChild (index, set, range) {
    // console.log('vojde', this.origin, ', set: ', set);
    if (!index) return;
    // console.log(index)
    const currentIndex = index.splice(0, 1);
    if (!this.origin?.children) return;
    if (this.origin.children?.content) {
      this.parentPath.push({ origin: this.origin, range: range, bin: currentIndex });
      console.log(this.parentPath);
      this.origin = this.origin.children.content[currentIndex];
      this.isOnSet = false;
    } else if (Object.keys(this.origin.children).includes(set)) {
      this.parentPath.push({ origin: this.origin, range: range, bin: currentIndex });
      this.origin = this.origin.children[set][currentIndex];
      this.isOnSet = true;
    } else {
      console.error("Bad set or index specified.");
      return;
    }
    // console.log(this.origin)
    this.title = this.origin.fTitle;
    this.path = this.path + "/" + this.origin.fName;
    if (index.length > 0) {
      this.setOriginToChild(index, set);
    }
  }

  /**
   * @note Index have to exclude first index as the pointer is already on this node.
   * */
  getChildByPosition (index, set, node = this.origin) {
    if (!index || index.length === 0) return node;
    const currentIndex = index.pop();
    if (!node?.children) return node;
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
  setOriginToParent (steps = 1) {
    if (steps <= 0 || this.parentPath.length === 0) return;
    const pathIndex = this.path.lastIndexOf("/");
    this.path = this.path.slice(0, pathIndex);
    const parent = this.parentPath.pop();
    if (parent) {
      this.origin = parent.origin;
    }
    this.title = this.origin.fTitle;
    this.setOriginToParent(steps - 1);
    this.isOnSet = false;
  }

}