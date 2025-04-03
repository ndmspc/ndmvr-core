# ndmvr-aframe

Package for creating 3D visualization of histograms.

Built on top of [A-Frame](https://aframe.io/)

## Features

- A-Frame components for rendering histogram.
- Components have customizable functionality.
- RxJs predefined subjects to communicate internally.
- Ability to make connection to websocket.

## Getting started

**_NOTE:_** In this tutorial Vite with vanilla js is used, if you want to use different Vite template please see [Vite guide](https://vite.dev/guide/).

To build your own application from scratch you can do.

```
npm create vite@latest my-app -- --template vanilla
npm install
npm install @ndmspc/ndmvr-aframe
npm run dev
```

## Examples

After you have ndmvr-aframe package installed, you can use it like this.

### Basic example

In main.js

```javascript
import { fullAframeScene, registerComponents } from "ndmvr-aframe";

registerComponents();
document.querySelector("#app").appendChild(fullAframeScene());
```

### How to pass functions to component

- You can pass single or array of functions to function subject.
- event identifies type of event on which the component will then listen to.
- target identifies objects to whose will those functions will bind to.
  - entity is type of A-Frame entity.
  - id is id of A-Frame component id in scene.
- function is plain js function which will be started when the event is triggered.

**_NOTE:_** Initialization of components can take some time at the start, so it is better to wait 100ms with setTimeout.

```javascript
const functions = [
  {
    event: "click",
    target: {
      entity: "histogram",
      id: [1, 2],
    },
    function: function (data) {
      const scale = data.target.object3D.scale;
      if (scale.x > 3) {
        scale.x = 1;
        scale.y = 1;
        scale.z = 1;
      }
      data.target.object3D.scale.set(
        scale.x * 1.1,
        scale.y * 1.1,
        scale.z * 1.1,
      );
    },
  },
  {
    event: "mouseenter",
    target: {
      entity: "histogram",
      id: "*",
    },
    function: function (data) {
      console.log(data);
    },
  },
];

setTimeout(() => functionSubjectGet().addFunctions(functions), 100);
```

### How to create connection to websocket

BrokerManager provides functionality duplex websocket connection.

1. Using createWsFromParams.

In parameters of URL then needs to be URLs of websockets, also option for automatic connections.

```javascript
// URL e.g. http://host?ws=ws://localhost:8088&autoConnect=true
brokerManagerGet().createWsFromParams(
  new URL(window.location.href).searchParams,
);
```

2. Using createWs.

Arguments of this function is string of URL and boolean value for `autoConnect`.

##### After creating connection

- After creation of brokers which handles websocket connections you can then.

  - Subscribe for incoming messages and set what should be the callback when the message arrives.

  ```javascript
  brokerManagerGet()
    .getSubject()
    .subscribe((v) => {
      console.log(v);
    });
  ```

  - Send messages back to server

  ```javascript
  brokerManagerGet().getBrokerByUrl(URL, autoConnect)
         .send(JSON.stringify({"your data goes here"}));
  ```

### Histogram render example

You can see example of rendered histogram at: our [Gitlab pages](https://ndmvr-aframe-af55bd.gitlab.io/hrend.html)

This example uses **histogram** component. If you want to use it in your app you can pass root json object to it via:

- **histogram_source_url** which is part of the schema of this component.

  ```html
  <a-entity
    id="histogram18bins"
    position="-140 0 0"
    histogram="histogram_source_url:../../public/histograms/TH3variableBinning55x57x34.json;"
  >
  </a-entity>
  ```

- Assigning id to it and passing the root json object by rxjs **histogramSubject**.

  ```html
  <a-entity id="histogram1" position="0 0 0" histogram> </a-entity>
  ```

  ```javascript
  import { parse } from "jsroot";
  histogramSubjectGet().next({ id: "histogram1", histogram: parse(v) });
  ```

### Dynamic rendering of histogram

**histogram** component also supports dynamic rendering of histogram.

On how to set it up yourself you can get inspired with our stress test.

- **Prerequisites**

  - Pull **NdmSpc** Docker image from repository: [registry.gitlab.com/ndmspc/ndmspc:v0.20250304.0]()
  - Run the image via Docker or your preferred container tool.

  ```shell
  docker run --rm --init --name ndmspc -p 8080:8080 registry.gitlab.com/ndmspc/ndmspc:v0.20250304.0 ndmspc-cli serve stress -t 1000
  ```

  - You can set parameter of **t** which sets frequency with which histograms will be sent.

- With prerequisites completed you can head over to our webpage locally <http://localhost:5173/stress.html> or from our demo page from [Gitlab Pages](https://ndmvr-aframe-af55bd.gitlab.io/stress.html).
- Address that internal websocket will try to connect to is defined in **URL params**. Available parameters are:
  - **ws** Defines address websocket will connect to
  - **autoConnect** Defines whether websocket should connect automatically. If not you either have to call:
    - **connectWsByUrl** from brokerManager.
    - **getBrokerByUrl.connect()** from brokerManager.
  - **timeout** Defines timeout (amount of time client will be trying to connect to server from start, or after disconnect).
- Final address can then look like this for local or demo page:

  - <https://http://localhost:5173/stress.html?ws=ws://localhost:8080/ws/root.websocket&autoConnect=true&timeout=60000>
  - <https://ndmvr-aframe-af55bd.gitlab.io/stress.html?ws=ws://localhost:8080/ws/root.websocket&autoConnect=true&timeout=60000>

