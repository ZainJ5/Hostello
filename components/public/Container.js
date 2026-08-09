import { cn } from '@/lib/utils';

/**
 * The single horizontal rhythm for every public page.
 *
 * The gutter matches site-header 73:66 and site-footer 73:156 exactly, so a
 * page's first column lines up with the logo above it and the footer below it.
 * The frame is drawn at 1440 with an 80 gutter; on a real display that leaves
 * far too much air, so the gutter steps 16, 24, 40 and the frame widens.
 *
 * `width` narrows the measure for long-form prose without changing the gutter,
 * so a paragraph never runs to 1280 but still starts on the same vertical.
 */
const WIDTHS = {
  full: 'max-w-[100rem]',
  default: 'max-w-[100rem]',
  content: 'max-w-6xl',
  narrow: 'max-w-6xl',
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
        'mx-auto w-full px-4 sm:px-6 lg:px-10',
        WIDTHS[width] || WIDTHS.default,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
