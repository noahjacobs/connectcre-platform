import { useCallback, useState } from "react";
import { Sheet, Scroll } from "@silk-hq/components";
import "./ExampleSheetWithDepth.css";
import {
  SheetWithDepthRoot,
  SheetWithDepthStack,
  SheetWithDepthStackBackground,
  SheetWithDepthStackFirstSheetBackdrop,
  SheetWithDepthStackScenery,
  SheetWithDepthView,
} from "./SheetWithDepth";

import { SheetTriggerCard } from "@/components/ui/SheetTriggerCard/SheetTriggerCard";

const ExampleSheetWithDepthView = ({ data }: any) => {
  const [scrolled, setScrolled] = useState(false);
  const travelStatusChangeHandler = useCallback((travelStatus: string) => {
    if (travelStatus === "idleOutside")
      setTimeout(() => setScrolled(false), 10);
  }, []);

  return (
    <SheetWithDepthView onTravelStatusChange={travelStatusChangeHandler}>
      <Scroll.Root className="ExampleSheetWithDepth-scrollView" asChild>
        <Scroll.View
          scrollGestureTrap={{ yEnd: true }}
          onScroll={({ distance }) => setScrolled(distance > 0)}
        >
          <Scroll.Content className="ExampleSheetWithDepth-scrollContent">
            <div className="ExampleSheetWithDepth-banner" />
            <div className="ExampleSheetWithDepth-profilePicture" />
            <div className="ExampleSheetWithDepth-info">
              <div className="ExampleSheetWithDepth-identification">
                <Sheet.Title className="ExampleSheetWithDepth-username">
                  {data.name}
                </Sheet.Title>
                <div className="ExampleSheetWithDepth-handle">
                  @{data.handle}
                </div>
              </div>

              <div className="ExampleSheetWithDepth-metrics">
                <div className="ExampleSheetWithDepth-metric">
                  <span className="ExampleSheetWithDepth-metricCount">
                    {data.followers}
                  </span>
                  <span className="ExampleSheetWithDepth-metricLabel">
                    {" "}
                    followers
                  </span>
                </div>

                <div className="ExampleSheetWithDepth-metric">
                  <span className="ExampleSheetWithDepth-metricCount">
                    {data.following}
                  </span>
                  <span className="ExampleSheetWithDepth-metricLabel">
                    {" "}
                    following
                  </span>
                </div>

                <div className="ExampleSheetWithDepth-metric">
                  <span className="ExampleSheetWithDepth-metricCount">
                    {data.posts}
                  </span>
                  <span className="ExampleSheetWithDepth-metricLabel">
                    {" "}
                    posts
                  </span>
                </div>
              </div>

              <div className="ExampleSheetWithDepth-bio">{data.bio}</div>
            </div>
            <SheetWithDepthRoot className="ExampleSheetWithDepth-nestedSheetRoot">
              <section className="ExampleSheetWithDepth-posts">
                {data.content.map((post: any, index: number) => (
                  <div className="ExampleSheetWithDepth-post" key={index}>
                    {post.reposted && (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ExampleSheetWithDepth-postRepostIcon"
                        >
                          <path d="m2 9 3-3 3 3" />
                          <path d="M13 18H7a2 2 0 0 1-2-2V6" />
                          <path d="m22 15-3 3-3-3" />
                          <path d="M11 6h6a2 2 0 0 1 2 2v10" />
                        </svg>

                        <div className="ExampleSheetWithDepth-postRepostText">
                          {data.name} reposted
                        </div>
                      </>
                    )}
                    <div className="ExampleSheetWithDepth-postProfilePicture" />
                    <div className="ExampleSheetWithDepth-postContent">
                      <div className="ExampleSheetWithDepth-postHeader">
                        <div className="ExampleSheetWithDepth-postUsername">
                          {post.username}
                        </div>
                        <div>@{post.handle}</div>
                        <div>·</div>
                        <div>{post.hoursPast}h</div>
                      </div>
                      <div className="ExampleSheetWithDepth-postBody">
                        {post.content.map(
                          (paragraph: string, index: number) => (
                            <p
                              className="ExampleSheetWithDepth-postParagraph"
                              key={index}
                            >
                              {paragraph}
                            </p>
                          )
                        )}
                      </div>
                      <div className="ExampleSheetWithDepth-postActions">
                        <div className="ExampleSheetWithDepth-postAction">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.05"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ExampleSheetWithDepth-postCommentsIcon"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <div className="ExampleSheetWithDepth-postCommentsCount">
                            {post.commentsCount}
                          </div>
                        </div>
                        <div className="ExampleSheetWithDepth-postAction">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="23"
                            height="23"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ExampleSheetWithDepth-postSharesIcon"
                          >
                            <path d="m2 9 3-3 3 3" />
                            <path d="M13 18H7a2 2 0 0 1-2-2V6" />
                            <path d="m22 15-3 3-3-3" />
                            <path d="M11 6h6a2 2 0 0 1 2 2v10" />
                          </svg>
                          <div className="ExampleSheetWithDepth-postSharesCount">
                            {post.sharesCount}
                          </div>
                        </div>
                        <div className="ExampleSheetWithDepth-postAction">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.05"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ExampleSheetWithDepth-postLikesIcon"
                          >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                          <div className="ExampleSheetWithDepth-postLikesCount">
                            {post.likesCount}
                          </div>
                        </div>

                        <div className="ExampleSheetWithDepth-postAction">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ExampleSheetWithDepth-postShareIcon"
                          >
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" x2="12" y1="2" y2="15" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              {data.nestedSheet && (
                <div className="ExampleSheetWithDepth-relatedPages">
                  <SheetTriggerCard color="blue">
                    Sheet with Depth
                  </SheetTriggerCard>
                </div>
              )}
              {data.nestedSheet && (
                <ExampleSheetWithDepthView data={data.nestedSheet} />
              )}
            </SheetWithDepthRoot>
          </Scroll.Content>
        </Scroll.View>
      </Scroll.Root>
      <div className={`ExampleSheetWithDepth-topBar fullyVisible-${scrolled}`}>
        <Sheet.Trigger
          className="ExampleSheetWithDepth-dismissTrigger"
          action="dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`ExampleSheetWithDepth-topDismissIcon fullyVisible-${scrolled}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`ExampleSheetWithDepth-flowDismissIcon fullyVisible-${scrolled}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </Sheet.Trigger>

        <h3 className="ExampleSheetWithDepth-topBarTitle">{data.name}</h3>
      </div>
    </SheetWithDepthView>
  );
};

const ExampleSheetWithDepth = ({ data }: any) => {
  return (
    <SheetWithDepthRoot>
      <SheetTriggerCard color="blue">Sheet with Depth</SheetTriggerCard>
      <ExampleSheetWithDepthView data={data} />
    </SheetWithDepthRoot>
  );
};

export {
  SheetWithDepthStack as ExampleSheetWithDepthStack,
  SheetWithDepthStackScenery as ExampleSheetWithDepthStackScenery,
  SheetWithDepthStackBackground as ExampleSheetWithDepthStackBackground,
  SheetWithDepthStackFirstSheetBackdrop as ExampleSheetWithDepthStackFirstSheetBackdrop,
  ExampleSheetWithDepth,
};
