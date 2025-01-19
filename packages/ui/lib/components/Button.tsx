import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../utils';

export type ButtonProps = {
  theme?: 'light' | 'dark';
} & ComponentPropsWithoutRef<'button'>;

export function Button({ theme, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(className, 'py-1 px-4 rounded shadow hover:scale-105 bg-orange-500 disabled:opacity-75')}
      {...props}>
      {children}
    </button>
  );
}
