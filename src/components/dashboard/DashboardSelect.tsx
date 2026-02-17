import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';

interface DashboardSelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface DashboardSelectProps<T extends string> {
  id?: string;
  value: T;
  options: Array<DashboardSelectOption<T>>;
  onValueChange: (value: T) => void;
  placeholder?: string;
  size?: 'default' | 'compact';
  triggerClassName?: string;
  contentClassName?: string;
  triggerStyleOverride?: CSSProperties;
  contentStyleOverride?: CSSProperties;
  getOptionClassName?: (value: T) => string;
}

const defaultTriggerClass =
  'h-auto w-full rounded-xl border px-5 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 data-[placeholder]:text-gray-400 [&_svg]:text-gray-400';

const compactTriggerClass =
  'h-auto rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 [&_svg]:text-gray-400';

const defaultContentClass =
  'z-[80] mt-3 rounded-xl border p-0 shadow-2xl';

const itemClass =
  'w-full cursor-pointer whitespace-nowrap border-b border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.024)] px-5 py-3 text-left text-sm text-gray-300 outline-none transition-all duration-150 data-[highlighted]:text-white data-[state=checked]:text-white last:border-b-0';
const disabledItemClass =
  'cursor-not-allowed text-gray-500 data-[highlighted]:bg-[rgba(255,255,255,0.024)] data-[highlighted]:text-gray-500';

const triggerStyle = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  color: 'rgb(229, 231, 235)',
} as const;

const contentStyle = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  backgroundColor: 'rgb(25, 25, 28)',
} as const;

const handleItemMouseEnter = (event: ReactMouseEvent<HTMLElement>) => {
  if (event.currentTarget.getAttribute('data-disabled') !== null) {
    return;
  }
  event.currentTarget.style.transform = 'scale(1.02)';
  event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
};

const handleItemMouseLeave = (event: ReactMouseEvent<HTMLElement>) => {
  if (event.currentTarget.getAttribute('data-disabled') !== null) {
    event.currentTarget.style.transform = 'scale(1)';
    event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.024)';
    return;
  }
  event.currentTarget.style.transform = 'scale(1)';
  event.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.024)';
};

export function DashboardSelect<T extends string>({
  id,
  value,
  options,
  onValueChange,
  placeholder,
  size = 'default',
  triggerClassName,
  contentClassName,
  triggerStyleOverride,
  contentStyleOverride,
  getOptionClassName,
}: DashboardSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as T)}>
      <SelectTrigger
        id={id}
        className={cn(
          size === 'default' ? defaultTriggerClass : compactTriggerClass,
          triggerClassName,
        )}
        style={triggerStyleOverride ? { ...triggerStyle, ...triggerStyleOverride } : triggerStyle}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent
        className={cn(defaultContentClass, contentClassName)}
        style={contentStyleOverride ? { ...contentStyle, ...contentStyleOverride } : contentStyle}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              itemClass,
              option.disabled ? disabledItemClass : '',
              getOptionClassName?.(option.value),
            )}
            hideIndicator
            disabled={option.disabled}
            onMouseEnter={handleItemMouseEnter}
            onMouseLeave={handleItemMouseLeave}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
