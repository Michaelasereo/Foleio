import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarProps {
  mode?: "single" | "multiple" | "range"
  selected?: Date | Date[]
  onSelect?: (date: Date | Date[] | undefined) => void
  disabled?: (date: Date) => boolean
  modifiers?: Record<string, (date: Date) => boolean>
  modifiersClassNames?: Record<string, string>
  className?: string
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  modifiers = {},
  modifiersClassNames = {},
  className,
  ...props
}: CalendarProps & React.HTMLAttributes<HTMLDivElement>) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const today = new Date()
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const handleDateClick = (date: Date) => {
    if (disabled?.(date)) return

    if (mode === "single") {
      onSelect?.(date)
    } else if (mode === "multiple") {
      const currentSelected = Array.isArray(selected) ? selected : []
      const isAlreadySelected = currentSelected.some(
        selectedDate => selectedDate.toDateString() === date.toDateString()
      )

      let newSelected: Date[]
      if (isAlreadySelected) {
        // Remove the date if it's already selected
        newSelected = currentSelected.filter(
          selectedDate => selectedDate.toDateString() !== date.toDateString()
        )
      } else {
        // Add the date if it's not selected
        newSelected = [...currentSelected, date]
      }

      onSelect?.(newSelected)
    }
  }

  const isSelected = (date: Date) => {
    if (!selected) return false
    if (mode === "single") {
      return selected instanceof Date && date.toDateString() === selected.toDateString()
    }
    if (mode === "multiple" && Array.isArray(selected)) {
      return selected.some(selectedDate => selectedDate.toDateString() === date.toDateString())
    }
    return false
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isDisabled = (date: Date) => {
    return disabled?.(date) || false
  }

  const hasModifier = (date: Date, modifier: string) => {
    return modifiers[modifier]?.(date) || false
  }

  const getModifierClasses = (date: Date) => {
    const classes: string[] = []
    Object.keys(modifiers).forEach(modifier => {
      if (hasModifier(date, modifier) && modifiersClassNames[modifier]) {
        classes.push(modifiersClassNames[modifier])
      }
    })
    return classes.join(' ')
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className={cn("p-3 bg-background border rounded-md", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-accent rounded-md"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-accent rounded-md"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium p-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => (
          <div key={index} className="aspect-square">
            {date ? (
              <button
                onClick={() => handleDateClick(date)}
                disabled={isDisabled(date)}
                className={cn(
                  "w-full h-full text-sm rounded-md hover:bg-accent transition-colors",
                  "flex items-center justify-center",
                  getModifierClasses(date),
                  {
                    "bg-primary text-primary-foreground": isSelected(date),
                    "bg-accent text-accent-foreground": isToday(date) && !isSelected(date),
                    "text-muted-foreground opacity-50": isDisabled(date),
                    "cursor-not-allowed": isDisabled(date),
                    "cursor-pointer": !isDisabled(date)
                  }
                )}
              >
                {date.getDate()}
              </button>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Calendar }
