import { cn } from '@/lib/utils';

/**
 * The single horizontal rhythm for every public page: one gutter scale
 * (16 / 24 / 32px) and three max-widths. Sections import this instead of
 * re-declaring padding, so nothing drifts out of alignment between pages.
 */
const WIDTHS = {
  narrow: 'max-w-3xl', // long-form prose
  content: 'max-w-5xl', // hero copy, forms
  default: 'max-w-7xl', // grids and rails
};

export default function Container({
  as: Tag = 'div',
  width = 'default',
  className,
  children,
  ...props
}) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        WIDTHS[width] || WIDTHS.default,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
