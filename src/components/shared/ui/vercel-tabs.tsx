"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[]
  activeTab?: string | null
  onTabChange?: (tabId: string) => void
  onTabHover?: (tabId: string) => void
  tabProps?: Record<string, React.HTMLAttributes<HTMLDivElement>>
}

const VercelTabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onTabChange, onTabHover, tabProps, ...props }, ref) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [activeIndex, setActiveIndex] = useState(() => {
      return activeTab ? tabs.findIndex(tab => tab.id === activeTab) : -1;
    });
    const [hoverStyle, setHoverStyle] = useState({})
    const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" })
    const tabRefs = useRef<Array<HTMLDivElement | null>>([])
    const tabsContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const newIndex = activeTab ? tabs.findIndex(tab => tab.id === activeTab) : -1;
      setActiveIndex(newIndex);
    }, [activeTab, tabs]);

    useEffect(() => {
      if (hoveredIndex !== null) {
        const hoveredElement = tabRefs.current[hoveredIndex]
        if (hoveredElement && tabsContainerRef.current) {
          const { offsetLeft, offsetWidth } = hoveredElement
          const scrollLeft = tabsContainerRef.current.scrollLeft
          
          setHoverStyle({
            left: `${offsetLeft - scrollLeft}px`,
            width: `${offsetWidth}px`,
          })
        }
      }
    }, [hoveredIndex])

    useEffect(() => {
      if (activeIndex >= 0) {
        const activeElement = tabRefs.current[activeIndex]
        if (activeElement && tabsContainerRef.current) {
          const { offsetLeft, offsetWidth } = activeElement
          const scrollLeft = tabsContainerRef.current.scrollLeft
          
          setActiveStyle({
            left: `${offsetLeft - scrollLeft}px`,
            width: `${offsetWidth}px`,
          })
          
          if (activeElement) {
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center'
            });
          }
        }
      } else {
        setActiveStyle({ left: "0px", width: "0px" });
      }
    }, [activeIndex, tabs, tabs[activeIndex]?.count]);

    useEffect(() => {
      const handleScroll = () => {
        if (tabsContainerRef.current) {
          if (hoveredIndex !== null) {
            const hoveredElement = tabRefs.current[hoveredIndex]
            if (hoveredElement) {
              const { offsetLeft, offsetWidth } = hoveredElement
              const scrollLeft = tabsContainerRef.current.scrollLeft
              
              setHoverStyle({
                left: `${offsetLeft - scrollLeft}px`,
                width: `${offsetWidth}px`,
              })
            }
          }
          
          if (activeIndex >= 0) {
            const activeElement = tabRefs.current[activeIndex]
            if (activeElement) {
              const { offsetLeft, offsetWidth } = activeElement
              const scrollLeft = tabsContainerRef.current.scrollLeft
              
              setActiveStyle({
                left: `${offsetLeft - scrollLeft}px`,
                width: `${offsetWidth}px`,
              })
            }
          }
        }
      }
      
      const tabsContainer = tabsContainerRef.current
      if (tabsContainer) {
        tabsContainer.addEventListener('scroll', handleScroll)
        return () => tabsContainer.removeEventListener('scroll', handleScroll)
      }
    }, [hoveredIndex, activeIndex])

    const setTabRef = (el: HTMLDivElement | null, index: number) => {
      tabRefs.current[index] = el
    }

    return (
      <div 
        ref={ref} 
        className={cn("pt-[9px] px-2 relative w-full", className)} 
        {...props}
      >
        <div className="relative">
          {/* Hover Highlight */}
          <div
            className="absolute h-[32px] transition-all duration-200 ease-out bg-[#0e0f1114] dark:bg-[#ffffff1a] rounded-[6px] flex items-center"
            style={{
              ...hoverStyle,
              opacity: hoveredIndex !== null ? 1 : 0,
            }}
          />

          {/* Tabs */}
          <div 
            ref={tabsContainerRef}
            className="relative flex items-center overflow-x-auto pb-[9px] scrollbar-hide"
          >
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                ref={(el) => setTabRef(el, index)}
                className={cn(
                  "px-2 md:px-3 py-2 cursor-pointer transition-all duration-200 ease-out h-[32px] shrink-0", 
                  index !== tabs.length - 1 ? "mr-[6px]" : "",
                  index === activeIndex && activeIndex >= 0
                    ? "text-[#0e0e10] dark:text-white" 
                    : "text-[#0e0f1199] dark:text-[#ffffff99]"
                )}
                onMouseEnter={() => {
                  setHoveredIndex(index)
                  onTabHover?.(tab.id)
                }}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  setActiveIndex(index)
                  onTabChange?.(tab.id)
                }}
                {...(tabProps?.[tab.id] || {})}
              >
                <div className="text-sm font-medium leading-5 whitespace-nowrap flex items-center justify-center h-full gap-2">
                  <span>{tab.label}</span>
                  {/* Always show count badge if count exists and is > 0 */}
                  {tab.count !== undefined && tab.count > 0 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={cn(
                        "bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full",
                        "min-w-[20px] min-h-[20px] flex items-center justify-center",
                        // Add styles for non-active tabs to ensure visibility
                        index !== activeIndex && "bg-opacity-90"
                      )}
                    >
                      {tab.count}
                    </motion.span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Active Indicator */}
          {activeIndex >= 0 && (
            <div
              className="absolute bottom-0 h-[2px] bg-[#0e0f11] dark:bg-white transition-all duration-200 ease-out z-10" 
              style={activeStyle}
            />
          )}
        </div>
      </div>
    )
  }
)
VercelTabs.displayName = "VercelTabs"

export { VercelTabs }