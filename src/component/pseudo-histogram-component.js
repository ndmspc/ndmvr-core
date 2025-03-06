import "aframe";

const registerPseudoHistogramComponent = () => {

    AFRAME.registerComponent("pseudo-histogram", {
    schema: {
        bin_size: {type: "vec3", default: "1 1 1"},
        bin_count: {type: "vec3", default: "10 10 10"},
        bin_padding: {type: "vec3", default: "0.5 0.5 0.5"},
        visible_ratio: {type: "number", default: 1},
        batch_size: {type: "int", default: 100}
    },

    startState: undefined,
    renderState: undefined,
    posIncrement: undefined,
    posFinal: undefined,
    noOfBins: 0,


    init: function () {
          console.log("pseudo-histogram > init:");

          this.startState = {
            x_pos:0,
            y_pos:this.data.bin_size.y/2 + this.data.bin_padding.y,
            z_pos:0
          };


          this.renderState = {
            x_pos:this.startState.x_pos,
            y_pos:this.startState.y_pos,
            z_pos:this.startState.z_pos,
            binColorVal:33456,
            binsRendered:0
          };

          this.noOfBins = this.data.bin_count.x*this.data.bin_count.y*this.data.bin_count.z;
          this.posIncrement={
              x:this.data.bin_size.x + this.data.bin_padding.x,
              y:this.data.bin_size.y + this.data.bin_padding.y,
              z:this.data.bin_size.z + this.data.bin_padding.z,
            };
          this.posFinal={
            x:this.renderState.x_pos + (this.data.bin_count.x-1) * this.posIncrement.x,
            y:this.renderState.y_pos + (this.data.bin_count.y-1) * this.posIncrement.y,
            z:this.renderState.z_pos + (this.data.bin_count.z-1) * this.posIncrement.z
          };

          this.meshElId = `${this.el.id}_mesh`;
          this.render_histogram_batch = this.render_histogram_batch.bind(this);
          requestAnimationFrame(this.render_histogram_batch);
          // this.render_histogram_atOnce();

          console.log(this.renderState,this.noOfBins);
    },

    /**
     * Bin renderer utilizing instanced meshes
     */
    render_bin: function (x_pos,y_pos,z_pos, bin_size,  bin_scale, color, visible, meshElId) {
          const block = document.createElement('a-entity');
          block.object3D.position.set(x_pos,y_pos,z_pos);
          block.object3D.scale.set(bin_size.x*bin_scale.x, bin_size.y*bin_scale.y, bin_size.z*bin_scale.z);
          const mElIdSel = `#${meshElId}`;
          block.object3D.visible = visible;

          block.setAttribute("instanced-mesh-member",
                             {mesh: mElIdSel,
                              colors: color});
          this.el.appendChild(block); 
    },


    /**
     * Bin renderer not utilizing instanced meshes
     */
    render_bin_no_instc_mesh: function (x_pos,y_pos,z_pos, bin_size,  bin_scale, color, visible) {
        const block = document.createElement('a-box');
        block.object3D.position.set(x_pos,y_pos,z_pos);
        block.object3D.scale.set(bin_size.x*bin_scale.x, bin_size.y*bin_scale.y, bin_size.z*bin_scale.z);
        block.object3D.visible = visible;
        block.setAttribute("color",color);
        this.el.appendChild(block);
    },

  
    render_histogram_atOnce: function () {

      let visible=true;
      let binColor = "";
      let binScale = {
              x:1,
              y:1,
              z:1
      }      
      let visChance = 0;
      

      let shouldContinue = false;

      for(let z_pos=this.renderState.z_pos; z_pos<=this.posFinal.z; z_pos+=this.posIncrement.z){
        for(let y_pos=this.renderState.y_pos; y_pos<=this.posFinal.y; y_pos+=this.posIncrement.y){
          for(let x_pos=this.renderState.x_pos; x_pos<=this.posFinal.x; x_pos+=this.posIncrement.x){

            // binColor = `#${Math.floor(Math.random()*16000000).toString(16).padStart(6, '0')}`;
            
            this.renderState.binColorVal += 100;
            if (this.renderState.binColorVal>16000000) this.renderState.binColorVal = 1000;
            binColor = `#${this.renderState.binColorVal.toString(16).padStart(6, '0')}`;
            
            binScale = {
              x:Math.random(),
              y:Math.random(),
              z:Math.random()
            };
            
            visChance = Math.random();
            if (visChance>this.data.visible_ratio){
              visible = false;
              // console.log("invis");
            }else{
              visible = true;
            }
            this.render_bin(x_pos,y_pos,z_pos, this.data.bin_size, binScale, binColor, visible, this.meshElId);
            
          }
        }
      }
    },

    render_histogram_batch: function () {

      let visible=true;
      let binColor = "";
      let binScale = {
              x:1,
              y:1,
              z:1
      }      
      let visChance = 0;
      
      let currentBatchCount = 0;
      
      while (currentBatchCount<this.data.batch_size){
        
        
        this.renderState.binColorVal += 255;
        if (this.renderState.binColorVal>16000000) this.renderState.binColorVal = 1000;
        binColor = `#${this.renderState.binColorVal.toString(16).padStart(6, '0')}`;

        binScale = {
          x:Math.random(),
          y:Math.random(),
          z:Math.random()
        };

        visChance = Math.random();
        if (visChance>this.data.visible_ratio){
          visible = false;
          // console.log("invis");
        }else{
          visible = true;
        }
        // this.render_bin_no_instc_mesh(this.renderState.x_pos,this.renderState.y_pos,this.renderState.z_pos, this.data.bin_size, binScale, binColor, visible);
        this.render_bin(this.renderState.x_pos,this.renderState.y_pos,this.renderState.z_pos, this.data.bin_size, binScale, binColor, visible, this.meshElId);
        
        const nextX = this.renderState.x_pos+this.posIncrement.x;
        
        if(nextX<=this.posFinal.x){
          this.renderState.x_pos=nextX;
        }else{
          this.renderState.x_pos=this.startState.x_pos;
          const nextY = this.renderState.y_pos+this.posIncrement.y;
          if(nextY<=this.posFinal.y){
            this.renderState.y_pos=nextY;
          }else{
            this.renderState.y_pos=this.startState.y_pos;
            const nextZ = this.renderState.z_pos+this.posIncrement.z;
            if(nextZ<=this.posFinal.z){
              this.renderState.z_pos=nextZ;
            }else{
              return;
            }
          }
        }
        
        currentBatchCount++;        
        this.renderState.binsRendered++;
        
        // console.log(currentBatchCount, this.renderState, this.noOfBins)
        if(this.renderState.binsRendered>=this.noOfBins){
          return;
        }
      }
      requestAnimationFrame(this.render_histogram_batch);
   }
});
}

export default registerPseudoHistogramComponent;


