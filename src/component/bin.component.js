import "aframe";

const registerBinComponent = () => {
    /* global AFRAME, THREE */
AFRAME.registerComponent("bin", {
    schema: {
        root_rel_pos : {type: "vec3"}
    },

    histComp: undefined,


    init: function() {
      // console.log("bin>", this.el.id, this.data.root_rel_pos, this.el.parentNode.id);
      
      this.histComp = this.el.parentNode.components['histogram-skor'];
      if(this.histComp){
        this.rootObj = this.histComp.rootObj;
      }
      console.log(this.el.id, this.el.innerHTML);
    }  
});
}

export default registerBinComponent;