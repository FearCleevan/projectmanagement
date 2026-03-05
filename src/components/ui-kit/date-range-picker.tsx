"use client";

import * as React from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  startDate?: string;
  dueDate?: string;
  disabled?: boolean;
  onChange: (next: { startDate?: string; dueDate?: string }) => void;
};

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function DateRangePicker({ startDate, dueDate, disabled, onChange }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activeField, setActiveField] = React.useState<"start" | "due">("start");
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const base = parseDateString(startDate) ?? parseDateString(dueDate) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const start = React.useMemo(() => parseDateString(startDate), [startDate]);
  const due = React.useMemo(() => parseDateString(dueDate), [dueDate]);
  const hasSelectedRange = Boolean(startDate || dueDate);
  const today = atMidnight(new Date());
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const days = React.useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const base = parseDateString(startDate) ?? parseDateString(dueDate) ?? new Date();
    setVisibleMonth(new Date(base.getFullYear(), base.getMonth(), 1));

    if (!startDate && !dueDate) {
      setActiveField("start");
      return;
    }

    if (startDate && !dueDate) {
      setActiveField("due");
      return;
    }

    if (!startDate && dueDate) {
      setActiveField("start");
    }
  }, [dueDate, open, startDate]);

  const setValue = (field: "start" | "due", date: Date) => {
    const selected = toDateString(date);
    let nextStart = field === "start" ? selected : startDate;
    let nextDue = field === "due" ? selected : dueDate;

    if (nextStart && nextDue && nextDue < nextStart) {
      [nextStart, nextDue] = [nextDue, nextStart];
    }

    onChange({
      startDate: nextStart || undefined,
      dueDate: nextDue || undefined,
    });
  };

  const handlePickDate = (date: Date) => {
    if (startDate && dueDate) {
      onChange({
        startDate: toDateString(date),
        dueDate: undefined,
      });
      setActiveField("due");
      return;
    }

    setValue(activeField, date);
    if (activeField === "start") {
      setActiveField("due");
    } else {
      setOpen(false);
    }
  };

  const clearDates = () => onChange({ startDate: undefined, dueDate: undefined });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {!hasSelectedRange ? (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={activeField === "start" && open ? "default" : "outline"}
                      size="icon"
                      className="size-9"
                      onClick={() => {
                        setActiveField("start");
                        if (!open) {
                          setOpen(true);
                        }
                      }}
                      disabled={disabled}
                      aria-label="Select start date"
                    >
                      <Calendar className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Start date
                    <br />
                    None
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={activeField === "due" && open ? "default" : "outline"}
                      size="icon"
                      className="size-9"
                      onClick={() => {
                        setActiveField("due");
                        if (!open) {
                          setOpen(true);
                        }
                      }}
                      disabled={disabled}
                      aria-label="Select due date"
                    >
                      <CalendarDays className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Due date
                    <br />
                    None
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm",
                  disabled ? "opacity-60" : "cursor-pointer"
                )}
              >
                <Calendar className="size-4 text-muted-foreground" />
                <span>{formatRangeLabel(start, due)}</span>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      clearDates();
                    }}
                    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Clear selected dates"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-3 sm:w-[360px]" align="start">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-md border p-0.5">
                <Button
                  type="button"
                  variant={activeField === "start" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setActiveField("start")}
                >
                  <Calendar className="mr-1 size-3.5" />
                  Start
                </Button>
                <Button
                  type="button"
                  variant={activeField === "due" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setActiveField("due")}
                >
                  <CalendarDays className="mr-1 size-3.5" />
                  Due
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="inline-flex overflow-hidden rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-none"
                    onClick={() => setVisibleMonth((current) => new Date(current.getFullYear() - 1, current.getMonth(), 1))}
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-none border-l"
                    onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
                <p className="text-base font-semibold">{monthLabel}</p>
                <div className="inline-flex overflow-hidden rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-none"
                    onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-none border-l"
                    onClick={() => setVisibleMonth((current) => new Date(current.getFullYear() + 1, current.getMonth(), 1))}
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="flex h-8 items-center justify-center text-xs font-semibold text-muted-foreground"
                  >
                    {weekday}
                  </div>
                ))}
                {days.map((day) => {
                  const isStart = sameDay(day.date, start);
                  const isDue = sameDay(day.date, due);
                  const isToday = sameDay(day.date, today);
                  const inRange =
                    start && due && day.date >= atMidnight(start) && day.date <= atMidnight(due);

                  return (
                    <button
                      key={day.date.toISOString()}
                      type="button"
                      onClick={() => handlePickDate(day.date)}
                      className={cn(
                        "relative flex h-10 items-center justify-center rounded-md text-sm transition",
                        day.inCurrentMonth ? "text-foreground" : "text-muted-foreground/60",
                        inRange ? "bg-primary/15" : "hover:bg-muted",
                        isStart || isDue ? "bg-primary text-primary-foreground hover:bg-primary" : "",
                        isToday && !isStart && !isDue ? "ring-1 ring-primary/40" : ""
                      )}
                    >
                      {day.date.getDate()}
                      {isToday && !isStart && !isDue ? (
                        <span className="absolute bottom-1 size-1.5 rounded-full bg-primary/80" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function formatRangeLabel(start?: Date | null, due?: Date | null) {
  if (!start && !due) {
    return "No dates";
  }

  if (start && !due) {
    return `Start: ${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  if (!start && due) {
    return `Due: ${due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  return `${start!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} - ${due!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function parseDateString(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function atMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(left: Date, right: Date | null) {
  return Boolean(
    right &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  );
}

function getCalendarDays(baseMonth: Date) {
  const monthStart = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inCurrentMonth: date.getMonth() === baseMonth.getMonth(),
    };
  });
}
