/**
 * Centralized Theme System
 * 
 * Design tokens for colors, spacing, typography, and more.
 * Modern, sleek, professional palette for OEM TechTalk
 * 
 * Color Philosophy: Deep tech blues, vibrant cyans, professional purples
 */

// ============================================
// Color Palette
// ============================================

const colors = {
    // Primary Brand Colors - Modern Indigo/Purple
    primary: '#6366F1',        // Vibrant Indigo - Professional & Modern
    primaryLight: '#818CF8',   // Light Indigo
    primaryDark: '#4F46E5',    // Dark Indigo

    secondary: '#0EA5E9',      // Cyan Blue - Fresh & Tech
    secondaryLight: '#38BDF8', // Light Cyan
    secondaryDark: '#0284C7',  // Dark Cyan

    accent: '#8B5CF6',         // Purple - Innovation & Premium
    accentLight: '#A78BFA',    // Light Purple
    accentDark: '#7C3AED',     // Dark Purple

    // Neutral Colors
    white: '#FFFFFF',
    black: '#0F172A',          // Slightly softer than pure black

    // Background Colors - Soft & Clean
    background: '#F8FAFC',          // Soft blue-gray tint
    backgroundSecondary: '#F1F5F9', // Slightly darker
    backgroundTertiary: '#E2E8F0',  // Even darker

    // Text Colors - Improved Hierarchy
    text: '#0F172A',           // Primary text (slate-900)
    textSecondary: '#64748B',  // Secondary text (slate-500)
    textTertiary: '#94A3B8',   // Tertiary text (slate-400)
    textLight: '#FFFFFF',      // Text on dark backgrounds

    // Border Colors
    border: '#E2E8F0',         // Default border (slate-200)
    borderLight: '#F1F5F9',    // Light border
    borderDark: '#CBD5E1',     // Dark border

    // Status Colors
    success: '#10B981',        // Green - success states
    successLight: '#34D399',   // Light green
    successDark: '#059669',    // Dark green

    warning: '#F59E0B',        // Amber - warning states
    warningLight: '#FBBF24',   // Light amber
    warningDark: '#D97706',    // Dark amber

    danger: '#EF4444',         // Red - danger states only
    dangerLight: '#F87171',    // Light red
    dangerDark: '#DC2626',     // Dark red

    info: '#0EA5E9',           // Cyan - info states
    infoLight: '#38BDF8',      // Light cyan
    infoDark: '#0284C7',       // Dark cyan

    // Safety Warning Colors (for equipment manuals)
    safetyDanger: '#EF4444',   // DANGER warnings
    safetyWarning: '#F59E0B',  // WARNING caution
    safetyCaution: '#0EA5E9',  // CAUTION notices

    // Overlay Colors
    overlay: 'rgba(15, 23, 42, 0.6)',      // Dark slate overlay
    overlayLight: 'rgba(15, 23, 42, 0.3)', // Light slate overlay

    // Feature Accent Colors
    feature1: '#6366F1',       // Indigo - primary features
    feature2: '#8B5CF6',       // Purple - premium features
    feature3: '#0EA5E9',       // Cyan - interactive features

    // Utility Colors
    transparent: 'transparent',
    disabled: '#CBD5E1',
    shadow: 'rgba(15, 23, 42, 0.1)',
} as const;

// ============================================
// Spacing System (4px base unit)
// ============================================

const spacing = {
    xxs: 2,   // 2px
    xs: 4,    // 4px
    sm: 8,    // 8px
    md: 16,   // 16px
    lg: 24,   // 24px
    xl: 32,   // 32px
    xxl: 48,  // 48px
    xxxl: 64, // 64px
} as const;

// ============================================
// Typography System
// ============================================

const typography = {
    // Font Families
    fontFamily: {
        regular: 'System',      // iOS: SF Pro, Android: Roboto
        medium: 'System',
        semiBold: 'System',
        bold: 'System',
        // Can add custom fonts here later
    },

    // Font Sizes
    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        display: 40,
    },

    // Line Heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },

    // Font Weights
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semiBold: '600' as const,
        bold: '700' as const,
    },

    // Predefined Text Styles
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        lineHeight: 40,
        color: colors.text,
    },
    h2: {
        fontSize: 24,
        fontWeight: '700' as const,
        lineHeight: 32,
        color: colors.text,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
        color: colors.text,
    },
    h4: {
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 24,
        color: colors.text,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
        color: colors.text,
    },
    bodyLarge: {
        fontSize: 18,
        fontWeight: '400' as const,
        lineHeight: 28,
        color: colors.text,
    },
    bodySmall: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
        color: colors.textSecondary,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
        color: colors.textSecondary,
    },
    label: {
        fontSize: 14,
        fontWeight: '500' as const,
        lineHeight: 20,
        color: colors.text,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        lineHeight: 24,
        color: colors.white,
    },
} as const;

// ============================================
// Border Radius
// ============================================

const borderRadius = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999, // Circle
} as const;

// ============================================
// Shadows & Elevation
// ============================================

const shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    sm: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    xl: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
} as const;

// ============================================
// Opacity
// ============================================

const opacity = {
    disabled: 0.5,
    hover: 0.8,
    pressed: 0.6,
    overlay: 0.7,
} as const;

// ============================================
// Z-Index (Stacking Order)
// ============================================

const zIndex = {
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
} as const;

// ============================================
// Layout
// ============================================

const layout = {
    // Container widths
    containerMaxWidth: 1200,
    contentMaxWidth: 800,

    // Safe area padding
    screenPadding: spacing.md,
    cardPadding: spacing.md,

    // Header/Footer heights
    headerHeight: 60,
    tabBarHeight: 60,

    // Common dimensions
    buttonHeight: 48,
    inputHeight: 48,
    iconSize: 24,
    avatarSize: 40,
} as const;

// ============================================
// Animation/Timing
// ============================================

const animation = {
    fast: 200,
    normal: 300,
    slow: 500,
} as const;

// ============================================
// Component-Specific Styles
// ============================================

const components = {
    // Button variants
    button: {
        primary: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            textColor: colors.white,
        },
        secondary: {
            backgroundColor: colors.secondary,
            borderColor: colors.secondary,
            textColor: colors.white,
        },
        outline: {
            backgroundColor: colors.transparent,
            borderColor: colors.primary,
            textColor: colors.primary,
        },
        ghost: {
            backgroundColor: colors.transparent,
            borderColor: colors.transparent,
            textColor: colors.primary,
        },
        danger: {
            backgroundColor: colors.danger,
            borderColor: colors.danger,
            textColor: colors.white,
        },
    },

    // Card styles
    card: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },

    // Input styles
    input: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.text,
    },

    // Badge styles
    badge: {
        success: {
            backgroundColor: colors.success,
            textColor: colors.white,
        },
        warning: {
            backgroundColor: colors.warning,
            textColor: colors.white,
        },
        danger: {
            backgroundColor: colors.danger,
            textColor: colors.white,
        },
        info: {
            backgroundColor: colors.info,
            textColor: colors.white,
        },
    },
} as const;

// ============================================
// Dark Mode Colors
// ============================================

const darkColors = {
    // Primary Brand Colors - Brighter for dark mode
    primary: '#818CF8',        // Lighter Indigo for visibility
    primaryLight: '#A5B4FC',   // Even lighter
    primaryDark: '#6366F1',    // Original indigo

    secondary: '#38BDF8',      // Lighter Cyan
    secondaryLight: '#7DD3FC', // Even lighter cyan
    secondaryDark: '#0EA5E9',  // Original cyan

    accent: '#A78BFA',         // Lighter Purple
    accentLight: '#C4B5FD',    // Even lighter purple
    accentDark: '#8B5CF6',     // Original purple

    // Neutral Colors
    white: '#FFFFFF',
    black: '#000000',

    // Background Colors - Dark slate tones
    background: '#0F172A',          // Dark slate
    backgroundSecondary: '#1E293B', // Lighter dark slate
    backgroundTertiary: '#334155',  // Even lighter

    // Text Colors - Inverted hierarchy
    text: '#F1F5F9',           // Light text (slate-100)
    textSecondary: '#CBD5E1',  // Medium light (slate-300)
    textTertiary: '#94A3B8',   // Dimmer (slate-400)
    textLight: '#F8FAFC',      // Brightest text

    // Border Colors - Subtle in dark mode
    border: '#334155',         // slate-700
    borderLight: '#1E293B',    // slate-800
    borderDark: '#475569',     // slate-600

    // Status Colors - Slightly muted
    success: '#34D399',        // Lighter green
    successLight: '#6EE7B7',   // Even lighter
    successDark: '#10B981',    // Original

    warning: '#FBBF24',        // Lighter amber
    warningLight: '#FCD34D',   // Even lighter
    warningDark: '#F59E0B',    // Original

    danger: '#F87171',         // Lighter red
    dangerLight: '#FCA5A5',    // Even lighter
    dangerDark: '#EF4444',     // Original

    info: '#38BDF8',           // Lighter cyan
    infoLight: '#7DD3FC',      // Even lighter
    infoDark: '#0EA5E9',       // Original

    // Safety Warning Colors
    safetyDanger: '#F87171',   
    safetyWarning: '#FBBF24',  
    safetyCaution: '#38BDF8',  

    // Overlay Colors - Lighter for dark mode
    overlay: 'rgba(0, 0, 0, 0.7)',      
    overlayLight: 'rgba(0, 0, 0, 0.5)', 

    // Feature Accent Colors
    feature1: '#818CF8',       
    feature2: '#A78BFA',       
    feature3: '#38BDF8',       

    // Utility Colors
    transparent: 'transparent',
    disabled: '#475569',
    shadow: 'rgba(0, 0, 0, 0.4)',
} as const;

// ============================================
// Dark Mode Shadows (softer in dark mode)
// ============================================

const darkShadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    sm: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    xl: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 12,
    },
} as const;

// ============================================
// Export Light Theme Object
// ============================================

export const lightTheme = {
    colors,
    spacing,
    typography: {
        ...typography,
        h1: { ...typography.h1, color: colors.text },
        h2: { ...typography.h2, color: colors.text },
        h3: { ...typography.h3, color: colors.text },
        h4: { ...typography.h4, color: colors.text },
        body: { ...typography.body, color: colors.text },
        bodyLarge: { ...typography.bodyLarge, color: colors.text },
        bodySmall: { ...typography.bodySmall, color: colors.textSecondary },
        caption: { ...typography.caption, color: colors.textSecondary },
        label: { ...typography.label, color: colors.text },
        button: { ...typography.button, color: colors.white },
    },
    borderRadius,
    shadows,
    opacity,
    zIndex,
    layout,
    animation,
    components: {
        ...components,
        card: {
            ...components.card,
            backgroundColor: colors.white,
        },
    },
    isDark: false,
} as const;

// ============================================
// Export Dark Theme Object
// ============================================

export const darkTheme = {
    colors: darkColors,
    spacing,
    typography: {
        ...typography,
        h1: { ...typography.h1, color: darkColors.text },
        h2: { ...typography.h2, color: darkColors.text },
        h3: { ...typography.h3, color: darkColors.text },
        h4: { ...typography.h4, color: darkColors.text },
        body: { ...typography.body, color: darkColors.text },
        bodyLarge: { ...typography.bodyLarge, color: darkColors.text },
        bodySmall: { ...typography.bodySmall, color: darkColors.textSecondary },
        caption: { ...typography.caption, color: darkColors.textSecondary },
        label: { ...typography.label, color: darkColors.text },
        button: { ...typography.button, color: darkColors.white },
    },
    borderRadius,
    shadows: darkShadows,
    opacity,
    zIndex,
    layout,
    animation,
    components: {
        ...components,
        card: {
            ...components.card,
            backgroundColor: darkColors.backgroundSecondary,
        },
    },
    isDark: true,
} as const;

// ============================================
// Default Export (Light Theme - for backwards compatibility)
// ============================================

export const theme = lightTheme;

// ============================================
// Type Exports (for TypeScript)
// ============================================

export type Theme = typeof theme;
export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeTypography = typeof typography;

// ============================================
// Utility Functions
// ============================================

/**
 * Helper function to add opacity to hex color
 * @param color - Hex color string
 * @param opacity - Opacity value 0-1
 * @returns RGBA color string
 */
export function addOpacity(color: string, opacity: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Helper to get contrasting text color (white or black)
 * @param backgroundColor - Background hex color
 * @returns Text color (white or black)
 */
export function getContrastTextColor(backgroundColor: string): string {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? colors.text : colors.white;
}

// Default export
export default theme;
