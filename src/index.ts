import { doPost, asyncLogging, executeCommandLgtm } from "./Code";
import path from "path";

declare const global: {
  [x: string]: unknown;
};

global.doPost = doPost;
global.asyncLogging = asyncLogging;
global.executeCommandLgtm = executeCommandLgtm;

global.setTimeout = (callback: () => void, timeout: number) => {
  Utilities.sleep(timeout);
  callback();
};

global.self = this;
global.__dirname = () => {
  return path.resolve(path.dirname(""));
};
