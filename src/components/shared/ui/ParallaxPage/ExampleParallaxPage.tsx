import React from "react";
import { Scroll, Sheet } from "@silk-hq/components";
import {
  ParallaxPageStack as ExampleParallaxPageStack,
  ParallaxPageStackOutlet as ExampleParallaxPageStackOutlet,
  ParallaxPageStackMenuItem as ExampleParallaxPageStackMenuItem,
  ParallaxPage,
} from "./ParallaxPage";
import "./ExampleParallaxPage.css";

import { SheetTriggerCard } from "@/components/ui/SheetTriggerCard/SheetTriggerCard";
import { ExampleSheetWithDepth } from "../SheetWithDepth/ExampleSheetWithDepth";
import { ExampleSheetWithDepthData } from "../SheetWithDepth/ExampleSheetWithDepthData";

interface ExampleParallaxPageProps
  extends React.HTMLAttributes<HTMLDivElement> {
  data: any;
}

const ExampleParallaxPage = ({
  data,
  ...restProps
}: ExampleParallaxPageProps) => {
  return (
    <ParallaxPage
      sheetTitle={data.title}
      presentTrigger={
        <SheetTriggerCard color="green">Parallax Page</SheetTriggerCard>
      }
      sheetContent={
        <Scroll.Root asChild>
          <Scroll.View className="ExampleParallaxPage-scrollView">
            <Scroll.Content asChild>
              <article className="ExampleParallaxPage-article">
                <div className="ExampleParallaxPage-illustration" />
                <div className="ExampleParallaxPage-articleContent">
                  <Sheet.Title className="ExampleParallaxPage-title" asChild>
                    <h1>{data.title}</h1>
                  </Sheet.Title>
                  <h2 className="ExampleParallaxPage-subtitle">
                    {data.subtitle}
                  </h2>
                  <div className="ExampleParallaxPage-author">
                    by{" "}
                    <span className="ExampleParallaxPage-authorName">
                      {data.author}
                    </span>
                  </div>
                  <section className="ExampleParallaxPage-articleBody">
                    {data.content.map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </section>
                  {data.nestedSheet && (
                    <div className="ExampleParallaxPage-relatedPages">
                      <ExampleParallaxPage data={data.nestedSheet} />
                      <ExampleSheetWithDepth data={ExampleSheetWithDepthData} />
                    </div>
                  )}
                </div>
              </article>
            </Scroll.Content>
          </Scroll.View>
        </Scroll.Root>
      }
      {...restProps}
    />
  );
};

export {
  ExampleParallaxPageStack,
  ExampleParallaxPageStackOutlet,
  ExampleParallaxPageStackMenuItem,
  ExampleParallaxPage,
};
