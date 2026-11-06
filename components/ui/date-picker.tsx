"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DATE_FORMAT = "yyyy-MM-dd";
const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

interface PickerProps {
  /** "yyyy-MM-dd" for DatePicker, "yyyy-MM-dd'T'HH:mm" for DateTimePicker — same as native inputs. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  /** Earliest selectable day, "yyyy-MM-dd". */
  min?: string;
  /** Latest selectable day, "yyyy-MM-dd". */
  max?: string;
  /** DatePicker only: allow year/month dropdowns (useful for date of birth). */
  captionLayout?: "label" | "dropdown";
}

function parseValue(value: string | undefined, fmt: string) {
  if (!value) return undefined;
  const parsed = parse(value, fmt, new Date());
  return isValid(parsed) ? parsed : undefined;
}

function parseDay(value?: string) {
  return parseValue(value, DATE_FORMAT);
}

const triggerClass =
  "h-11 w-full justify-start rounded-xl border-input bg-card px-4 font-normal shadow-sm hover:bg-card aria-invalid:border-destructive";

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  min,
  max,
  captionLayout = "label",
  ...rest
}: PickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseValue(value, DATE_FORMAT);
  const minDay = parseDay(min);
  const maxDay = parseDay(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={rest["aria-invalid"]}
          className={cn(triggerClass, !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout={captionLayout}
          selected={selected}
          defaultMonth={selected ?? maxDay}
          startMonth={captionLayout === "dropdown" ? (minDay ?? new Date(1940, 0)) : minDay}
          endMonth={captionLayout === "dropdown" ? (maxDay ?? new Date(new Date().getFullYear() + 10, 11)) : maxDay}
          disabled={[...(minDay ? [{ before: minDay }] : []), ...(maxDay ? [{ after: maxDay }] : [])]}
          onSelect={(day) => {
            if (day) {
              onChange(format(day, DATE_FORMAT));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  disabled,
  className,
  id,
  min,
  max,
  ...rest
}: PickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseValue(value, DATE_TIME_FORMAT);
  const time = selected ? format(selected, "HH:mm") : "09:00";
  const minDay = parseDay(min);
  const maxDay = parseDay(max);

  const commit = (day: Date, hhmm: string) =>
    onChange(`${format(day, DATE_FORMAT)}T${hhmm}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={rest["aria-invalid"]}
          className={cn(triggerClass, !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP 'at' p") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={[...(minDay ? [{ before: minDay }] : []), ...(maxDay ? [{ after: maxDay }] : [])]}
          onSelect={(day) => day && commit(day, time)}
        />
        <div className="flex items-center gap-3 border-t border-border p-3">
          <label htmlFor={id ? `${id}-time` : undefined} className="text-sm text-muted-foreground">
            Time
          </label>
          <Input
            id={id ? `${id}-time` : undefined}
            type="time"
            value={time}
            onChange={(e) => {
              if (!e.target.value) return;
              commit(selected ?? new Date(), e.target.value);
            }}
            className="h-9 w-32 [&::-webkit-calendar-picker-indicator]:hidden"
          />
          <Button type="button" size="sm" className="ml-auto" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker, DateTimePicker };
