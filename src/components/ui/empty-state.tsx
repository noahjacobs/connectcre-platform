import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icons?: LucideIcon[]
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  stats?: Array<{
    label: string
    value: string | number
  }>
  features?: string[]
  banner?: {
    type: 'info' | 'success'
    message: string
  }
  className?: string
}

export function EmptyState({
  title,
  description,
  icons = [],
  action,
  secondaryAction,
  stats,
  features,
  banner,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "bg-background border hover:border-muted text-center",
      "border-2 border-dashed rounded-xl p-14 w-full max-w-[620px]",
      "group hover:bg-muted/50 transition duration-500 hover:duration-200",
      className
    )}>
      <div className="flex justify-center isolate">
        {icons.length === 3 ? (
          <>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-border group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[0], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-border group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[1], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-border group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[2], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
          </>
        ) : icons.length === 2 ? (
          <>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative left-1.5 top-1.5 -rotate-3 shadow-lg ring-1 ring-border group-hover:-translate-x-3 group-hover:-rotate-6 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[0], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative right-1.5 top-1.5 rotate-3 shadow-lg ring-1 ring-border group-hover:translate-x-3 group-hover:rotate-6 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[1], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
          </>
        ) : (
          <div className="bg-background size-12 grid place-items-center rounded-xl shadow-lg ring-1 ring-border group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
            {icons[0] && React.createElement(icons[0], {
              className: "w-6 h-6 text-muted-foreground"
            })}
          </div>
        )}
      </div>
      <h3 className="text-foreground font-medium mt-6">{title}</h3>
      <p className="text-sm text-muted-foreground mt-4 whitespace-pre-line">{description}</p>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-lg font-semibold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      {features && (
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center justify-center gap-2">
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Banner */}
      {banner && (
        <div className={cn(
          "mt-6 p-3 rounded-lg text-sm",
          banner.type === 'info' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" :
          banner.type === 'success' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300" : ""
        )}>
          {banner.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-2 mt-6">
        {action && (
          <Button
            onClick={action.onClick}
            variant="outline"
            className={cn(
              "shadow-sm active:shadow-none"
            )}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}