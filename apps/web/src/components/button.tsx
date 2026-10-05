import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
// shadcn composition pattern: one semantic button, optional asChild for a link.
export function Button({ asChild = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return <Component className={`button ${className}`} {...props} />;
}
