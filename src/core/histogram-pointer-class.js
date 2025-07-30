export class HistogramPointerClass {

   rootObj = undefined;
   origin = undefined;
   parentPath = [];
   path = undefined;
   title = undefined;
   range = [];

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
   setOriginToChild(index, set) {
      console.log('vojde', this.origin);
      if (!index) return;
      console.log(index)
      const currentIndex = index.splice(0,1);
      if (!this.origin?.children) return;
      if (this.origin.children?.content) {
         this.parentPath.push(this.origin);
         this.origin = this.origin.children.content[currentIndex];
      } else if (Object.keys(this.origin.children).includes(set)) {
         this.parentPath.push(this.origin);
         this.origin = this.origin.children[set][currentIndex];
      } else {
         console.error('Bad set or index specified.');
         return;
      }
      console.log(this.origin)
      this.title = this.origin.fTitle;
      this.path = this.path + '/' + this.origin.fName;
      if (index.length > 0) {
         this.setOriginToChild(index, set);
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
         this.origin = parent;
      }
      this.title = this.origin.fTitle;
      this.setOriginToParent(steps - 1);
   }
}