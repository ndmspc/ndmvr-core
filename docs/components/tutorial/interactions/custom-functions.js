import {redraw} from "jsroot";
const functions = {
  empty: [{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }
  }],
  first: [{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "mousemove"
  }, {
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "mouseclick",
    function: function (event, context) {
      console.log("custom function from set functions: ", event, context);
    }
  }],
  second: [{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "mousedbclick",
    function: function (event, context) {
      console.log("custom function from set functions: ", event, context);
      const histogramBelow = context.pointer.getChildByPosition([...event.jsrootInstance]);
      redraw("jsrootdiv", histogramBelow);
    }
  },{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "mouseclick",
  },{
    target: {
      entity: "nested-histogram",
      id: "histogram1"
    }, event: "shiftmouseclick",
  }]
};

export default functions;