import { createContext } from "react";
import { createComponentId } from "@silk-hq/components";

const ParallaxPageStackContext = createContext<any>({});
const parallaxPageId = createComponentId();
const ParallaxPageExampleStackId = createContext<any>({});

const SheetWithDepthStackContext = createContext({} as any);
const sheetWithDepthStackId = createComponentId();

export {
  ParallaxPageStackContext,
  parallaxPageId,
  ParallaxPageExampleStackId,
  SheetWithDepthStackContext,
  sheetWithDepthStackId,
};
