import "aframe";

const registerHistogramSKorComponent = () => {

AFRAME.registerComponent("histogram-skor", {
    schema: {
        histogram_source_url: {type: "string", default: ""}, //url for the http request
        bin_padding_x: {type: "number", default: 0.5},
        bin_padding_y: {type: "number", default: 0.5},
        bin_padding_z: {type: "number", default: 0.5},
    },

    rootObj: undefined,


    init: function() {
      if(this.data.histogram_source_url){
        this.loadAndRenderHistogramByHttpRequest(this.data.histogram_source_url);              
      }
    },

  
    loadAndRenderHistogramByHttpRequest: function(url){
          if(url !== ""){
            fetch(url)
            .then(response =>response.json())
            .then(histJsObj => {
                //We use JSRoot's parse instead of httpRequest to be able to process JSRoot's json 
                //from various sources (http, socket, ...)
                //JSRoot's parse accepts both json string and an object parsed from it
                this.rootObj = window.jsRootProvider.parse(histJsObj);
                this.renderHistogram();
            })
            .catch(error => console.error('Error when fetching and rendering histogram:', error));
            
            //alternate form of fetching, using SRoot's httpRequest:
            //(we need )
            // window.jsRootProvider.httpRequest(url,"object")
            //   .then(histObj => {
            //     this.rootObj = histObj;
            //     this.renderHistogram();
            //   });
          }
    },


    renderHistogram: function () {
      if(this.rootObj){
        console.log("renderHistogram>", this.el.id, this.data.histogram_source_url, "rootMinMaxBinSizes:", getRootMinMaxBinSizes(this.rootObj));
        
        const binNoX = this.rootObj.fXaxis.fNbins;
        const binNoY = this.rootObj.fYaxis.fNbins;
        const binNoZ = this.rootObj.fZaxis.fNbins;
        
        const padding = {
          x:this.data.bin_padding_x,
          y:this.data.bin_padding_y,
          z:this.data.bin_padding_z,
        };
        
        let histogram_html="";
        let relPos = undefined;
        let aFrameBinSizePos = undefined;
        for (let relZ=1;relZ<=binNoZ;relZ++){
          for (let relY=1;relY<=binNoY;relY++){
            for (let relX=1;relX<=binNoX;relX++){
              relPos = {x:relX,y:relY,z:relZ};
              aFrameBinSizePos = computeAFrameBinSizePos(this.rootObj,relPos,padding);
              // console.log(aFrameBinSizePos);
              // histogram_html+=generate_bin_html(relPos,aFrameBinSizePos,"true");
              histogram_html+=generate_bin_html_v1(relPos,aFrameBinSizePos,"true");
            }          
          }         
        }
      // console.log("histogram > render_histogram: histogram_html=\n"+histogram_html);
      
      const refBoxHtml = `
      <a-box color="white" 
        position="0 0 0" 
        width="1" height="1" depth="1"
        visible="true"></a-box>`  
        
      this.el.innerHTML = histogram_html+refBoxHtml;
      }
    }


});
}

export default registerHistogramSKorComponent;
