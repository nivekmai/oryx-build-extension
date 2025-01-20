import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../utils';

export function Button({ className, children, ...props }: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      className={cn(className, 'py-1 px-4 rounded shadow hover:scale-105 bg-orange-500 disabled:opacity-75')}
      {...props}>
      {children}
    </button>
  );
}
