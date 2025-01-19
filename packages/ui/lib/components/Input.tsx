import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../utils';

export type InputProps = {
  placeholder: string;
  label: string;
} & ComponentPropsWithoutRef<'input'>;

export function Input({ className, children, id, placeholder, label, ...props }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className={cn(className, 'block mb-2 text-sm text-left font-medium text-white')}>
        {label}
      </label>
      <input
        type="text"
        id={id}
        className={cn(
          className,
          // lol wut
          'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg \
          focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 \
          dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 \
          dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500',
        )}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}
