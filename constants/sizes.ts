/**
 * Vestro Design System (VDS) - Size Constants
 * Used to maintain consistent spacing, dimensions, borders, and icon sizing.
 */

export const Sizes = {
  // Icon sizes
  iconMini: 15,
  iconSmall: 18,
  iconMedium: 20,
  iconLarge: 24,

  // Icon stroke widths
  strokeThin: 2,
  strokeMedium: 2.5,
  strokeThick: 3,

  // Layout & Spacing Fallbacks
  safeAreaBottomMin: 16,
  dividerHeight: 1,
  headerDotSize: 6,
  securityDotSize: 8,
  bottomButtonSize: 56, // w-14 h-14 is 56px
  
  // Card Widths
  cardWidthLogin: "85%",
  cardWidthLanding: "70%",

  // Sliding sheet dimensions
  sheetTranslateYClosed: 500,
} as const;
