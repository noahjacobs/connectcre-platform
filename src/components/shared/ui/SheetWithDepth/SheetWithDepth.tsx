"use client";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Sheet,
  SheetStack,
  animate,
  useThemeColorDimmingOverlay,
  usePageScrollData,
  SheetViewProps,
} from "@silk-hq/components";
import "./SheetWithDepth.css";
import { SheetWithDepthStackContext, sheetWithDepthStackId } from "../_global";

//
// The SheetStack Root sub-component and a context pasing down
// useful data

const SheetWithDepthStack = ({ children, ...restProps }: any) => {
  const stackBackgroundRef = useRef<HTMLElement | null>(null);
  const stackFirstSheetBackdropRef = useRef<HTMLElement | null>(null);

  //
  // Check if we are in iOS standalone mode

  const [iOSStandalone, setiOSStandalone] = useState(false);
  useEffect(() => {
    setiOSStandalone(
      // @ts-ignore
      window.navigator.standalone &&
        window.navigator.userAgent?.match(/iPhone|iPad/i)
    );
  }, []);

  //
  // Check if we native page scroll has been replaced

  const { nativePageScrollReplaced } = usePageScrollData();

  //
  // Will store the stacking count

  const [stackingCount, setStackingCount] = useState(0);

  //
  // Return

  const contextValue = useMemo(
    () => ({
      stackBackgroundRef,
      stackFirstSheetBackdropRef,
      iOSStandalone,
      nativePageScrollReplaced,
      stackingCount,
      setStackingCount,
    }),
    [iOSStandalone, nativePageScrollReplaced, stackingCount]
  );

  return (
    <SheetWithDepthStackContext.Provider value={contextValue}>
      <SheetStack.Root componentId={sheetWithDepthStackId} {...restProps}>
        {children}
      </SheetStack.Root>
    </SheetWithDepthStackContext.Provider>
  );
};

//
// The SheetStack Outlet used to wrap the scenery for the depth
// effect

const initialTopOffset = "max(env(safe-area-inset-top), 1.3vh)";

const SheetWithDepthStackScenery = ({ children, ref, ...restProps }: any) => {
  const { iOSStandalone, nativePageScrollReplaced } = useContext(
    SheetWithDepthStackContext
  );

  //
  // We have a different animation when the native page scroll
  // is replaced, and in iOS standalone mode.

  const restStyles = useMemo(
    () =>
      nativePageScrollReplaced
        ? iOSStandalone
          ? // In iOS standalone mode we don't need to animate the
            // border-radius because the corners are indeed
            // by the screen corners. So we just set the
            // border-radius to the needed value.
            {
              borderRadius: "24px",
              transformOrigin: "50% 0",
            }
          : // Outside of iOS standalone mode we do animate
            // the border-radius because the scenery is a
            // visible rectangle
            {
              borderRadius: ({ progress }: any) =>
                Math.min(progress * 24, 24) + "px",
              transformOrigin: "50% 0",
            }
        : // When the native page scroll is not replaced we
          // need to use the clipBoundary feature to cut off
          // the rest of the page.
          {
            clipBoundary: "layout-viewport",
            clipBorderRadius: "24px",
            clipTransformOrigin: "50% 0",
          },
    [nativePageScrollReplaced, iOSStandalone]
  );

  //
  // Return

  return (
    <SheetStack.Outlet
      forComponent={sheetWithDepthStackId}
      stackingAnimation={{
        translateY: ({ progress }) =>
          progress <= 1
            ? // prettier-ignore
              "calc(" + progress + " * " + initialTopOffset + ")"
            : // prettier-ignore
              "calc(" + initialTopOffset + " + 0.65vh * " + (progress - 1) + ")",
        scale: [1, 0.91],
        ...restStyles,
      }}
      {...restProps}
      ref={ref}
      asChild
    >
      {children}
    </SheetStack.Outlet>
  );
};

//
// The element used as black background for the stack.

const SheetWithDepthStackBackground = () => {
  const { nativePageScrollReplaced, stackBackgroundRef } = useContext(
    SheetWithDepthStackContext
  );

  return (
    // We are not using an Outlet with a stackingAnimation
    // here, but and an independant animation to have a
    // different, smoother easing.
    <div
      className={`SheetWithDepth-stackBackground nativePageScrollReplaced-${nativePageScrollReplaced}`}
      ref={stackBackgroundRef}
    />
  );
};

//
// The element used as backdrop for the first sheet, which only
// covers the stack scenery.

const SheetWithDepthStackFirstSheetBackdrop = () => {
  const { stackFirstSheetBackdropRef } = useContext(SheetWithDepthStackContext);

  return (
    // We are not using an Outlet with a stackingAnimation
    // here, but and an independant animation to have a
    // different, smoother easing.
    <div
      className="SheetWithDepth-stackFirstSheetBackdrop"
      ref={stackFirstSheetBackdropRef}
    />
  );
};

//
// The Sheet Root

interface SheetWithDepthRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SheetWithDepthRoot = ({
  children,
  ...restProps
}: SheetWithDepthRootProps) => {
  return (
    <Sheet.Root
      license="commercial"
      forComponent={sheetWithDepthStackId}
      {...restProps}
    >
      {children}
    </Sheet.Root>
  );
};

//
// The Sheet View and its content

interface SheetWithDepthViewProps
  extends SheetViewProps,
    React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SheetWithDepthView = ({
  children,
  onTravelStatusChange,
}: SheetWithDepthViewProps) => {
  const {
    stackingCount,
    setStackingCount,
    nativePageScrollReplaced,
    stackBackgroundRef,
    stackFirstSheetBackdropRef,
  } = useContext(SheetWithDepthStackContext);

  // To store the index of the Sheet in the stack
  const [indexInStack, setIndexInStack] = useState(0);
  const wentThroughExiting = useRef(false);
  const [travelStatus, setTravelStatus] = useState("idleOutside");

  const { setDimmingOverlayOpacity, animateDimmingOverlayOpacity } =
    useThemeColorDimmingOverlay({
      elementRef: stackBackgroundRef,
      dimmingColor: "rgb(0, 0, 0)",
    });

  const travelStatusChangeHandler = useCallback<
    Exclude<SheetViewProps["onTravelStatusChange"], undefined>
  >(
    (newTravelStatus) => {
      // * Run passed handler

      onTravelStatusChange?.(newTravelStatus);

      // * Handle logic

      if (travelStatus !== "stepping" && newTravelStatus === "idleInside") {
        if (indexInStack === 0) {
          setIndexInStack(stackingCount + 1);
        }
        setStackingCount((prevCount: number) => prevCount + 1);
      } else if (newTravelStatus === "idleOutside") {
        setIndexInStack(0);
        setStackingCount((prevCount: number) => prevCount - 1);
      }

      // * Animate on entering

      if (stackingCount === 0 && newTravelStatus === "entering") {
        wentThroughExiting.current = false;

        if (!nativePageScrollReplaced) {
          animateDimmingOverlayOpacity({ keyframes: [0, 1] });
        }
        animate(stackFirstSheetBackdropRef.current, {
          opacity: [0, 0.33],
        });
      }

      // * Animate on exiting

      if (stackingCount === 1 && newTravelStatus === "exiting") {
        wentThroughExiting.current = true;

        if (!nativePageScrollReplaced) {
          animateDimmingOverlayOpacity({ keyframes: [1, 0] });
        }
        animate(stackFirstSheetBackdropRef.current, {
          opacity: [0.33, 0],
        });
      }

      // * Store the state

      setTravelStatus(newTravelStatus);
    },
    [
      animateDimmingOverlayOpacity,
      indexInStack,
      nativePageScrollReplaced,
      setStackingCount,
      stackFirstSheetBackdropRef,
      stackingCount,
      travelStatus,
    ]
  );

  const travelHandler = useMemo(() => {
    if (
      indexInStack === 1 &&
      travelStatus !== "entering" &&
      travelStatus !== "exiting"
    ) {
      return ({ progress }: any) => {
        if (!nativePageScrollReplaced) {
          setDimmingOverlayOpacity(progress);
        }
        stackFirstSheetBackdropRef.current.style.setProperty(
          "opacity",
          (progress * 0.33) as unknown as string
        );
      };
    } else return undefined;
  }, [
    indexInStack,
    travelStatus,
    nativePageScrollReplaced,
    stackFirstSheetBackdropRef,
    setDimmingOverlayOpacity,
  ]);

  return (
    <Sheet.Portal>
      <Sheet.View
        className="SheetWithDepth-view"
        contentPlacement="bottom"
        onTravelStatusChange={travelStatusChangeHandler}
        onTravel={travelHandler}
        nativeEdgeSwipePrevention={true}
      >
        {/* We don't render the Backdrop for the first sheet in the stack (with index 1) */}
        {stackingCount > 0 && indexInStack !== 1 && (
          <Sheet.Backdrop
            className="SheetWithDepth-backdrop"
            travelAnimation={{ opacity: [0, 0.33] }}
          />
        )}
        <Sheet.Content
          className="SheetWithDepth-content"
          stackingAnimation={{
            translateY: ({ progress }) =>
              progress <= 1
                ? progress * -1.3 + "vh"
                : // prettier-ignore
                  "calc(-1.3vh + 0.65vh * " + (progress - 1) + ")",
            scale: [1, 0.91],
            transformOrigin: "50% 0",
          }}
        >
          <Sheet.BleedingBackground className="SheetWithDepth-bleedingBackground" />
          {children}
        </Sheet.Content>
      </Sheet.View>
    </Sheet.Portal>
  );
};

export {
  SheetWithDepthStack,
  SheetWithDepthStackScenery,
  SheetWithDepthStackBackground,
  SheetWithDepthStackFirstSheetBackdrop,
  //
  SheetWithDepthRoot,
  SheetWithDepthView,
};
