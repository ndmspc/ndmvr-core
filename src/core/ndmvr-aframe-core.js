import { registerComponents } from "./registerComponents.js";
import { brokerManagerGet } from "../service/brokerManager.js";

export const initNdmvrAframe = () => {
  brokerManagerGet().createWsFromParams(new URL(window.location.href).searchParams);
  registerComponents();
};
