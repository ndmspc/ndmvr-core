import {registerComponents} from "./registerComponents.js";
import brokerManagerGet from "../service/brokerManager.js";

brokerManagerGet().createWsFromParams(new URL(window.location.href).searchParams);
// setTimeout(() => brokerManagerGet().connectWsByUrl('ws://localhost:8080'), 2000);
registerComponents();
