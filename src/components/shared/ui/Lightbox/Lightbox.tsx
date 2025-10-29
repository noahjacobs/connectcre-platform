"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  Scroll,
  useClientMediaQuery,
  VisuallyHidden,
} from "@silk-hq/components";
import "./Lightbox.css";

import { SheetDismissButton } from "@/components/ui/_GenericComponents/SheetDismissButton/SheetDismissButton";

interface SideSheetProps {
  UIVisible: boolean;
  title: string;
  presentTriggerContent: React.ReactNode;
  content: React.ReactNode;
}

const SideSheet = ({
  UIVisible,
  title,
  presentTriggerContent,
  content,
}: SideSheetProps) => {
  const [reachedLastDetent, setReachedLastDetent] = useState(false);

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger
        className={`Lightbox-sideSheetPresentTrigger visible-${UIVisible}`}
      >
        {presentTriggerContent}
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View
          className="Lightbox-sideSheetView"
          enteringAnimationSettings="snappy"
          swipeOvershoot={false}
          detents={
            !reachedLastDetent
              ? "calc(var(--silk-100-lvh-dvh-pct) * 0.6 + 60px)"
              : undefined
          }
          onTravelStatusChange={(travelStatus) => {
            if (travelStatus === "idleOutside") setReachedLastDetent(false);
          }}
          onTravelRangeChange={(range) => {
            if (range.start === 2) setReachedLastDetent(true);
          }}
          nativeEdgeSwipePrevention={true}
        >
          <Sheet.Backdrop
            className="Lightbox-sideSheetBackdrop"
            travelAnimation={{ opacity: [0, 0.5] }}
          />
          <Sheet.Content className="Lightbox-sideSheetContent">
            <Sheet.BleedingBackground className="Lightbox-sideSheetBleedingBackground" />
            <div className="Lightbox-sideSheetHeader">
              <Sheet.Trigger
                className="Lightbox-sideSheetDismissTrigger"
                action="dismiss"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="Lightbox-sideSheetDismissIcon"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Sheet.Trigger>
              <Sheet.Title className="Lightbox-sideSheetTitle">
                {title}
              </Sheet.Title>
            </div>
            <Scroll.Root asChild>
              <Scroll.View
                scrollGestureTrap={{ yEnd: true }}
                scrollGesture={!reachedLastDetent ? false : "auto"}
              >
                <Scroll.Content>{content}</Scroll.Content>
              </Scroll.View>
            </Scroll.Root>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
};

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  presentTrigger: React.ReactNode;
  image: ({ className }: { className: string }) => React.ReactNode;
  sideContentTitle: string;
  sideSheetPresentTriggerContent: React.ReactNode;
  sideContent: React.ReactNode;
}

const Lightbox = ({
  presentTrigger,
  image,
  sideContentTitle,
  sideSheetPresentTriggerContent,
  sideContent,
  ...restProps
}: Props) => {
  const Illustration = image;
  const [status, setStatus] = useState("idleOutside");
  const largeViewport = useClientMediaQuery("(min-width: 1200px)");

  const [range, setRange] = useState({ start: 0, end: 0 });
  const [contentClicked, setContentClicked] = useState(false);
  const contentClickHandler = useCallback(
    () => setContentClicked((value) => !value),
    []
  );

  useEffect(() => {
    // Reset the value when closed
    if (status === "idleOutside") setContentClicked(false);
  }, [status]);

  const UIVisible = useMemo(
    () => range.start === 1 && range.end === 1 && !contentClicked,
    [status, range, contentClicked]
  );

  //

  return (
    <Sheet.Root className="Lightbox-root" license="commercial" {...restProps}>
      {presentTrigger}
      <Sheet.Portal>
        <Sheet.View
          className="Lightbox-view"
          contentPlacement="center"
          tracks={["top", "bottom"]}
          nativeEdgeSwipePrevention={true}
          onClickOutside={({ changeDefault }) => {
            changeDefault({ dismiss: false });
            contentClickHandler();
          }}
          exitingAnimationSettings={{
            preset: "gentle",
          }}
          onTravelStatusChange={(status) => setStatus(status)}
          onTravelRangeChange={setRange}
        >
          <Sheet.Backdrop
            travelAnimation={{
              opacity: [0, 1],
            }}
            themeColorDimming="auto"
          />
          <VisuallyHidden.Root asChild>
            <Sheet.Title>Lightbox Example</Sheet.Title>
          </VisuallyHidden.Root>
          <Sheet.Content
            className="Lightbox-content"
            style={{
              // @ts-ignore
              "--natural-image-width": 1878,
              // @ts-ignore
              "--natural-image-height": 1248,
            }}
            onClick={contentClickHandler}
          >
            <div className="Lightbox-imageCell">
              <div className="Lightbox-imageWrapper">
                <Illustration className="Lightbox-illustration" />
              </div>
            </div>
          </Sheet.Content>
          {!largeViewport && (
            <SideSheet
              UIVisible={UIVisible}
              title={sideContentTitle}
              presentTriggerContent={sideSheetPresentTriggerContent}
              content={sideContent}
            />
          )}
          {largeViewport && (
            <Sheet.Outlet
              className="Lightbox-sidebar"
              travelAnimation={{
                opacity: [0, 1],
              }}
            >
              {
                <div className="Lightbox-sidebarContainer">
                  <h2 className="Lightbox-sidebarTitle">{sideContentTitle}</h2>
                  <Scroll.Root asChild>
                    <Scroll.View safeArea="none">
                      <Scroll.Content>{sideContent}</Scroll.Content>
                    </Scroll.View>
                  </Scroll.Root>
                </div>
              }
            </Sheet.Outlet>
          )}
          <Sheet.Trigger action="dismiss" asChild>
            <SheetDismissButton
              className={`Lightbox-dismissTrigger visible-${UIVisible}`}
              variant="simple"
            />
          </Sheet.Trigger>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
};

export { Lightbox };
