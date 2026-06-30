/**
 * Vestro Design System (VDS) - Color Palette Constants
 * Based on the "Flat Minimalism" philosophy.
 */

export const Colors = {
  // Backgrounds
  background: '#fdfefe',
  backgroundDark: '#373737',
  backgroundLight: '#f9f9f9',
  
  // Text
  textPrimary: '#373737',
  textSecondary: '#666666',
  textMuted: '#999999',
  
  // Action / Accent (The "Vestro Red")
  actionPrimary: '#ee4e43',
  actionPrimaryLight: '#f47b73',
  actionPrimaryDark: '#cb3a31',
  
  // Borders & Separators
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  
  // System Status
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',

  // Status Colors (Alternative & Specific variants)
  successAlt: '#10b981', // Emerald-500 (used for Credit Shield status, Cash flow inflows, etc.)
  warningAlt: '#f59e0b', // Amber-500 (used for warnings)
  gold: '#d4af37',       // Gold (used for gold card tiers/status)

  // Muted/Neutral variants
  placeholderLight: '#ccc',
  textIconMuted: '#888',
  white: '#ffffff',

  // Stack stop gradients & Fallbacks
  darkStopStart: '#575757',
  darkStopEnd: '#1B1212',
  darkStopEndAlt: '#121212',
  darkStopEndHome: '#141414',
  analyticsLine: '#0091FF',
  
  // Gradients
  redGradient: ['#ee4e43', '#cb3a31'],
} as const;
