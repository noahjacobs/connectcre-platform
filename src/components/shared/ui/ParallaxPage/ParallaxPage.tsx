"use client";
import React, { useMemo, useContext } from "react";
import { ComponentId, Sheet, SheetStack } from "@silk-hq/components";
import { parallaxPageId, ParallaxPageStackContext } from "../_global";
import "./ParallaxPage.css";

interface ParallaxPageStackProps {
  stackId: ComponentId;
  pageContainer: React.RefObject<React.ReactNode | null> | null;
  menuTitleContainer: React.RefObject<React.ReactNode | null> | null;
  menuLeftContainer: React.RefObject<React.ReactNode | null> | null;
  children: React.ReactNode;
}

const ParallaxPageStack = ({
  stackId,
  pageContainer,
  menuTitleContainer,
  menuLeftContainer,
  children,
}: ParallaxPageStackProps) => {
  const containers = useMemo(
    () => ({
      stackId,
      pageContainer,
      menuTitleContainer,
      menuLeftContainer,
    }),
    [stackId, pageContainer, menuTitleContainer, menuLeftContainer]
  );

  return (
    <ParallaxPageStackContext.Provider value={containers}>
      <SheetStack.Root componentId={stackId}>{children}</SheetStack.Root>
    </ParallaxPageStackContext.Provider>
  );
};

interface ParallaxPageStackOutlet {
  children: React.ReactNode;
  ref?: React.RefObject<React.ReactNode>;
}

const ParallaxPageStackOutlet = ({
  children,
  ref,
  ...restProps
}: ParallaxPageStackOutlet) => {
  return (
    <SheetStack.Outlet
      stackingAnimation={{
        translateX: ({ progress }) =>
          progress <= 1
            ? // prettier-ignore
              progress * -80 + "px"
            : "-80px",
      }}
      className="ParallaxPageStack-outlet"
      {...restProps}
      ref={ref}
      asChild
    >
      {children}
    </SheetStack.Outlet>
  );
};

interface ParallaxPageStackMenuItemOutlet {
  children: React.ReactNode;
  ref?: React.RefObject<React.ReactNode>;
}

const ParallaxPageStackMenuItem = ({
  children,
  ref,
  ...restProps
}: ParallaxPageStackMenuItemOutlet) => {
  return (
    <SheetStack.Outlet
      stackingAnimation={{
        opacity: ({ progress }) => 0.75 - (1 / 0.75) * (progress - 0.25),
      }}
      {...restProps}
      ref={ref}
    >
      {children}
    </SheetStack.Outlet>
  );
};

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  presentTrigger: React.ReactNode;
  sheetContent: React.ReactNode;
  sheetTitle: string;
}

const ParallaxPage = ({
  presentTrigger,
  sheetContent,
  sheetTitle,
  ...restProps
}: Props) => {
  const { stackId, pageContainer, menuTitleContainer, menuLeftContainer } =
    useContext(ParallaxPageStackContext);

  return (
    <Sheet.Root
      license="commercial"
      componentId={parallaxPageId}
      forComponent={stackId}
      {...restProps}
    >
      {presentTrigger}
      <Sheet.Portal container={pageContainer}>
        <Sheet.View
          forComponent={parallaxPageId}
          className="ParallaxPage-view"
          contentPlacement="right"
          swipeOvershoot={false}
          nativeEdgeSwipePrevention={true}
        >
          <Sheet.Portal container={menuLeftContainer}>
            <Sheet.Trigger
              className="ParallaxPage-dismissTrigger"
              action="dismiss"
              travelAnimation={{
                visibility: "visible",
                opacity: ({ progress }) => (1 / 0.75) * (progress - 0.25),
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="ParallaxPage-dismissIcon"
              >
                <path
                  fillRule="evenodd"
                  d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </Sheet.Trigger>
          </Sheet.Portal>
          <Sheet.Portal container={menuTitleContainer}>
            <Sheet.Outlet
              travelAnimation={{
                opacity: ({ progress }) => (1 / 0.75) * (progress - 0.25),
              }}
              stackingAnimation={{
                opacity: ({ progress }) =>
                  0.75 - (1 / 0.75) * (progress - 0.25),
              }}
              className="ParallaxPage-menuTitle"
            >
              {sheetTitle}
            </Sheet.Outlet>
          </Sheet.Portal>
          <Sheet.Backdrop
            className="ParallaxPage-backdrop"
            travelAnimation={{ opacity: [0, 0.25] }}
          />
          <Sheet.Content
            className="ParallaxPage-content"
            stackingAnimation={{
              translateX: ({ progress }) =>
                progress <= 1
                  ? // prettier-ignore
                    progress * -80 + "px"
                  : "-80px",
            }}
            asChild
          >
            {sheetContent}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
};

export {
  ParallaxPageStack,
  ParallaxPageStackOutlet,
  ParallaxPageStackMenuItem,
  ParallaxPage,
};
