import type { Step } from "onborda";
import React from 'react';

// Define the Tour type locally if not exported by onborda
export interface Tour {
  tour: string;
  steps: Step[];
}

// Define individual steps first
const individualSteps: Step[] = [
  {
    icon: React.createElement(React.Fragment, null, "👋"),
    title: "Welcome to DevProjects!",
    content: React.createElement(React.Fragment, null, "Let\'s take a quick tour of the platform."),
    selector: "#tour-welcome",
    side: "bottom-left",
    showControls: true,
  },
  {
    icon: React.createElement(React.Fragment, null, "🏙️"),
    title: "Select a City",
    content: React.createElement(React.Fragment, null, "Explore data by selecting a city from the dropdown. Search by content or project address. The map updates instantly."),
    selector: "#tour-city-select",
    side: "bottom",
  },
  {
    icon: React.createElement(React.Fragment, null, "🗺️"),
    title: "Interactive Map & Filters",
    content: React.createElement(React.Fragment, null, "Visualize projects by proposed, approved, under construction, or completed. Filter by asset type."),
    selector: "#tour-map-filters",
    side: "left-top",
  },
  {
    icon: React.createElement(React.Fragment, null, "📰"),
    title: "Open a Post",
    content: React.createElement(React.Fragment, null, "Click a post to see a media gallery and key project info. Track a project's status and get notified when it changes."),
    selector: "#tour-posts",
    pointerPadding: 0,
    side: "right-top",
    // nextRoute: "?modal=tour"
  },
  {
    icon: React.createElement(React.Fragment, null, "🔖"),
    title: "Explore the Map",
    content: React.createElement(React.Fragment, null, "Click any map marker to view project details, or hover over posts to highlight their locations on the map."),
    selector: "#tour-project-map",
    pointerPadding: 0,
  },
  {
    icon: React.createElement(React.Fragment, null, "👤"),
    title: "Discover the Directory",
    content: React.createElement(React.Fragment, null, "Explore the DevProjects Directory for architects, developers, lenders, and more."),
    selector: "#tour-marketplace",
    side: "bottom",
  },
  {
    icon: React.createElement(React.Fragment, null, "📣"),
    title: "Share Your Feedback",
    content: React.createElement(React.Fragment, null, "We\'d love to hear what you think! Use this button to share your thoughts."),
    selector: "#tour-feedback",
    side: "bottom",
  },
];

// Define steps for the "howItWorks" tour
const howItWorksSteps: Step[] = [
  {
    icon: React.createElement(React.Fragment, null, "🏙️"),
    title: "Select a City",
    content: React.createElement(React.Fragment, null, "Explore data by selecting a city from the dropdown. Search by content or project address. The map updates instantly."),
    selector: "#tour-city-select",
    side: "bottom",
  },
  {
    icon: React.createElement(React.Fragment, null, "🗺️"),
    title: "Interactive Map & Filters",
    content: React.createElement(React.Fragment, null, "Visualize projects by proposed, approved, under construction, or completed. Filter by asset type."),
    selector: "#tour-map-filters",
    side: "left-top",
  },
  {
    icon: React.createElement(React.Fragment, null, "📰"),
    title: "Open a Post",
    content: React.createElement(React.Fragment, null, "Click a post to see a media gallery and key project info. Track a project's status and get notified when it changes."),
    selector: "#tour-posts",
    pointerPadding: 0,
    side: "right-top",
    // nextRoute: "?modal=tour"
  },
  {
    icon: React.createElement(React.Fragment, null, "🔖"),
    title: "Explore the Map",
    content: React.createElement(React.Fragment, null, "Click any map marker to view project details, or hover over posts to highlight their locations on the map."),
    selector: "#tour-project-map",
    side: "left-top",
    pointerPadding: 0,
  },
  {
    icon: React.createElement(React.Fragment, null, "👤"),
    title: "Discover the Directory",
    content: React.createElement(React.Fragment, null, "Explore the DevProjects Directory for architects, developers, lenders, and more."),
    selector: "#tour-marketplace",
    side: "bottom",
    // nextRoute: "/dashboard?marketplace",
  },
  {
    icon: React.createElement(React.Fragment, null, "📣"),
    title: "Share Your Feedback",
    content: React.createElement(React.Fragment, null, "We\'d love to hear what you think! Use this button to share your thoughts."),
    selector: "#tour-feedback",
    side: "bottom",
  },
];

// Define the tour object
export const tours: Tour[] = [
  {
    tour: "mainHomepageTour",
    steps: individualSteps,
  },
  {
    tour: "howItWorks",
    steps: howItWorksSteps,
  },
]; 