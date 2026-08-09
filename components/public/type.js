/**
 * The two display sizes that change between 390 and 1440.
 *
 * Measured off the frames rather than assumed. The page title renders at a
 * 17px cap height at 390 and the section titles at about 13px, which is
 * display/m and display/s respectively, one notch below what the 1440 frames
 * use. A 44px headline on a 390 phone would take three lines and read as
 * shouting; the file knows that and steps the scale down.
 *
 * WHY THE VALUES ARE REPEATED HERE. `.ds-display-*` are plain classes in the
 * token layer, not Tailwind utilities, so `lg:ds-display-xl` generates
 * nothing. The base class carries the family and the weight at every width and
 * only the three metrics are restated for the wide breakpoint. They are the
 * token layer's own values, in its own units.
 *
 * THIS BELONGS IN THE TOKEN LAYER. The right fix is for `.ds-display-xl` and
 * `.ds-display-m` to carry the step themselves, in one media query in
 * globals.css, and for this file to be deleted. That is a central change and
 * is flagged in the handover.
 */

/** display/m at 390, display/xl from lg. The one h1 on a page. */
export const TITLE =
  'ds-display-m sm:text-[2.125rem] sm:leading-[1.1] lg:text-[2.75rem] lg:leading-[1.0909] lg:tracking-[-0.02em]';

/** display/s at 390, display/m from lg. Section headings. */
export const SECTION_TITLE =
  'ds-display-s lg:text-[1.625rem] lg:leading-[1.1538] lg:tracking-[-0.015em]';
