/**
 * Centralized Theme System
 * 
 * Design tokens for colors, spacing, typography, and more.
 * FieldLogic Solutions brand palette for OEM TechTalk
 * 
 * Color Philosophy: FieldLogic navy, tech green, and bright blue
 * Green  (#78BE20) — "LOGIC" wordmark & circuit traces
 * Blue   (#1E90D4) — icon pin/gear shape
 * Navy   (#0D1929) — brand background
 */

// ============================================
// Color Palette
// ============================================

const colors = {
    // Primary Brand Colors - FieldLogic Green
    primary: '#78BE20',        // FieldLogic Green - brand identity
    primaryLight: '#95D44A',   // Lighter green
    primaryDark: '#5C9118',    // Darker green

    // Secondary Brand Colors - FieldLogic Blue
    secondary: '#1E90D4',      // FieldLogic Blue - icon/tech accent
    secondaryLight: '#44AAE8', // Lighter blue
    secondaryDark: '#1470A8',  // Darker blue

    // Accent - FieldLogic Navy (dark brand background)
    accent: '#162B44',         // Navy accent for cards, headers
    accentLight: '#1E3B5C',    // Lighter navy
    accentDark: '#0D1929',     // Deep navy

    // Neutral Colors
    white: '#FFFFFF',
    black: '#0A1020',          // Near-black with a navy tint

    // Background Colors - Clean light mode
    background: '#F7F9FC',          // Off-white with subtle blue tint
    backgroundSecondary: '#EDF1F7', // Slightly darker
    backgroundTertiary: '#DDE4EE',  // Card dividers, borders

    // Text Colors
    text: '#0D1929',           // Primary text — FieldLogic navy
    textSecondary: '#4A5F75',  // Secondary text — muted navy
    textTertiary: '#7A90A4',   // Tertiary text — light navy-gray
    textLight: '#FFFFFF',      // Text on dark backgrounds

    // Border Colors
    border: '#DDE4EE',         // Default border
    borderLight: '#EDF1F7',    // Light border
    borderDark: '#BDCAD8',     // Dark border

    // Status Colors
    success: '#78BE20',        // Reuse brand green for success
    successLight: '#95D44A',
    successDark: '#5C9118',

    warning: '#F59E0B',        // Amber - warning states
    warningLight: '#FBBF24',
    warningDark: '#D97706',

    danger: '#EF4444',         // Red - danger states only
    dangerLight: '#F87171',
    dangerDark: '#DC2626',

    info: '#1E90D4',           // Reuse brand blue for info
    infoLight: '#44AAE8',
    infoDark: '#1470A8',

    // Safety Warning Colors (for equipment manuals)
    safetyDanger: '#EF4444',   // DANGER warnings
    safetyWarning: '#F59E0B',  // WARNING caution
    safetyCaution: '#1E90D4',  // CAUTION notices — brand blue

    // Overlay Colors
    overlay: 'rgba(13, 25, 41, 0.65)',      // Navy overlay
    overlayLight: 'rgba(13, 25, 41, 0.35)', // Light navy overlay

    // Feature Accent Colors
    feature1: '#78BE20',       // Green - primary features
    feature2: '#1E90D4',       // Blue - interactive features
    feature3: '#162B44',       // Navy - premium/structural features

    // Utility Colors
    transparent: 'transparent',
    disabled: '#BDCAD8',
    shadow: 'rgba(13, 25, 41, 0.12)',
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
    // Primary Brand Colors - Brighter green for dark mode legibility
    primary: '#95D44A',        // Lighter FieldLogic green
    primaryLight: '#AADE6E',   // Even lighter
    primaryDark: '#78BE20',    // Original brand green

    // Secondary Brand Colors - Brighter blue for dark mode
    secondary: '#44AAE8',      // Lighter FieldLogic blue
    secondaryLight: '#72C0F0', // Even lighter
    secondaryDark: '#1E90D4',  // Original brand blue

    // Accent - lighter navy for dark mode surfaces
    accent: '#1E3B5C',         // Lighter navy for dark mode accents
    accentLight: '#2A4F78',    // Even lighter navy
    accentDark: '#162B44',     // Deep navy

    // Neutral Colors
    white: '#FFFFFF',
    black: '#000000',

    // Background Colors - True FieldLogic navy tones
    background: '#0D1929',          // Deep FieldLogic navy
    backgroundSecondary: '#162438', // Slightly lighter navy
    backgroundTertiary: '#1E3347',  // Card/surface level

    // Text Colors - Light on dark navy
    text: '#E8F0F7',           // Soft white with blue tint
    textSecondary: '#A8BDD0',  // Muted blue-gray
    textTertiary: '#6E8DA8',   // Dimmer blue-gray
    textLight: '#FFFFFF',      // Pure white

    // Border Colors - Subtle navy borders
    border: '#1E3347',         // Matches backgroundTertiary
    borderLight: '#162438',    // Matches backgroundSecondary
    borderDark: '#2A4F78',     // Slightly lighter navy

    // Status Colors - Slightly brightened for dark backgrounds
    success: '#95D44A',        // Lighter brand green
    successLight: '#AADE6E',
    successDark: '#78BE20',

    warning: '#FBBF24',        // Lighter amber
    warningLight: '#FCD34D',
    warningDark: '#F59E0B',

    danger: '#F87171',         // Lighter red
    dangerLight: '#FCA5A5',
    dangerDark: '#EF4444',

    info: '#44AAE8',           // Lighter brand blue
    infoLight: '#72C0F0',
    infoDark: '#1E90D4',

    // Safety Warning Colors
    safetyDanger: '#F87171',
    safetyWarning: '#FBBF24',
    safetyCaution: '#44AAE8',

    // Overlay Colors
    overlay: 'rgba(0, 0, 0, 0.75)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',

    // Feature Accent Colors
    feature1: '#95D44A',       // Lighter green
    feature2: '#44AAE8',       // Lighter blue
    feature3: '#2A4F78',       // Mid navy

    // Utility Colors
    transparent: 'transparent',
    disabled: '#2A4F78',
    shadow: 'rgba(0, 0, 0, 0.5)',
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
