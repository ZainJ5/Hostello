import { cn } from '@/lib/utils';

/**
 * The single horizontal rhythm for every public page.
 *
 * The gutter matches site-header 73:66 and site-footer 73:156 exactly, so a
 * page's first column lines up with the logo above it and the footer below it:
 * 16 at 390, 80 from lg up, inside a 1440 frame.
 *
 * `width` narrows the measure for long-form prose without changing the gutter,
 * so a paragraph never runs to 1280 but still starts on the same vertical.
 */
const WIDTHS = {
  full: 'max-w-[90rem]',
  default: 'max-w-[90rem]',
  content: 'max-w-4xl',
  narrow: 'max-w-3xl',
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
        'mx-auto w-full px-4 lg:px-20',
        WIDTHS[width] || WIDTHS.default,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
