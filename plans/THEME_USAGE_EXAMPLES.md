# Theme Usage Examples

This document shows how to use the centralized theme system in your components.

---

## Importing the Theme

```typescript
import { theme } from '@/utils/theme';
import { StyleSheet } from 'react-native';
```

---

## Basic Component Styling

### Example 1: Simple Button

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '@/utils/theme';

export function Button({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,        // Red background
    paddingVertical: theme.spacing.md,            // 16px vertical padding
    paddingHorizontal: theme.spacing.lg,          // 24px horizontal padding
    borderRadius: theme.borderRadius.md,          // 8px border radius
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,                          // Small shadow
  },
  buttonText: {
    ...theme.typography.button,                   // Predefined button text style
    color: theme.colors.white,                    // White text
  },
});
```

### Example 2: Card Component

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/utils/theme';

export function Card({ title, description }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  title: {
    ...theme.typography.h3,                       // Predefined h3 style
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.bodySmall,                // Predefined body small style
    color: theme.colors.textSecondary,
  },
});
```

### Example 3: Safety Warning Component

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/utils/theme';

type Severity = 'danger' | 'warning' | 'caution';

interface SafetyWarningProps {
  severity: Severity;
  message: string;
}

export function SafetyWarning({ severity, message }: SafetyWarningProps) {
  const backgroundColor = {
    danger: theme.colors.safetyDanger,
    warning: theme.colors.safetyWarning,
    caution: theme.colors.safetyCaution,
  }[severity];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.severityText}>{severity.toUpperCase()}</Text>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.white,
  },
  severityText: {
    ...theme.typography.label,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
});
```

### Example 4: Screen Layout

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { theme } from '@/utils/theme';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Content here */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,  // Space between items
  },
});
```

### Example 5: Input Field

```typescript
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { theme } from '@/utils/theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function Input({ label, value, onChangeText, placeholder }: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    height: theme.layout.inputHeight,
  },
});
```

---

## Using Color Variants

```typescript
// Primary (Red)
backgroundColor: theme.colors.primary,
backgroundColor: theme.colors.primaryLight,
backgroundColor: theme.colors.primaryDark,

// Secondary (Blue)
backgroundColor: theme.colors.secondary,
backgroundColor: theme.colors.secondaryLight,
backgroundColor: theme.colors.secondaryDark,

// Status colors
backgroundColor: theme.colors.success,  // Green
backgroundColor: theme.colors.warning,  // Amber
backgroundColor: theme.colors.danger,   // Red
backgroundColor: theme.colors.info,     // Blue

// Accent colors (Red, White, Blue)
backgroundColor: theme.colors.accent1,  // Red
backgroundColor: theme.colors.accent2,  // White
backgroundColor: theme.colors.accent3,  // Blue
```

---

## Using Spacing

```typescript
// Padding
padding: theme.spacing.md,              // 16px
paddingHorizontal: theme.spacing.lg,    // 24px
paddingTop: theme.spacing.xl,           // 32px

// Margin
margin: theme.spacing.sm,               // 8px
marginBottom: theme.spacing.md,         // 16px

// Gap (for flexbox)
gap: theme.spacing.md,                  // 16px between items
```

---

## Using Typography

```typescript
// Predefined text styles
<Text style={theme.typography.h1}>Heading 1</Text>
<Text style={theme.typography.h2}>Heading 2</Text>
<Text style={theme.typography.body}>Body text</Text>
<Text style={theme.typography.caption}>Caption</Text>

// Custom combination
const styles = StyleSheet.create({
  customText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.primary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.lg,
  },
});
```

---

## Using Shadows

```typescript
// Apply shadow to a component
const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.md,  // Spread shadow properties
  },
});

// Available shadows:
// theme.shadows.none
// theme.shadows.sm
// theme.shadows.md
// theme.shadows.lg
// theme.shadows.xl
```

---

## Using Border Radius

```typescript
borderRadius: theme.borderRadius.sm,    // 4px
borderRadius: theme.borderRadius.md,    // 8px
borderRadius: theme.borderRadius.lg,    // 12px
borderRadius: theme.borderRadius.full,  // Circle
```

---

## Using Component Presets

```typescript
// Button variants
const styles = StyleSheet.create({
  primaryButton: {
    ...theme.components.button.primary,
    padding: theme.spacing.md,
  },
  outlineButton: {
    ...theme.components.button.outline,
    padding: theme.spacing.md,
  },
});

// Card preset
const styles = StyleSheet.create({
  card: {
    ...theme.components.card,  // Includes background, border, shadow, padding
  },
});

// Input preset
const styles = StyleSheet.create({
  input: {
    ...theme.components.input,
  },
});
```

---

## Utility Functions

### Add Opacity to Colors

```typescript
import { addOpacity } from '@/utils/theme';

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: addOpacity(theme.colors.black, 0.5),  // 50% transparent black
  },
  lightButton: {
    backgroundColor: addOpacity(theme.colors.primary, 0.1),  // 10% red
  },
});
```

### Get Contrast Text Color

```typescript
import { getContrastTextColor } from '@/utils/theme';

const backgroundColor = theme.colors.primary;
const textColor = getContrastTextColor(backgroundColor);  // Returns white or black

const styles = StyleSheet.create({
  button: {
    backgroundColor: backgroundColor,
    color: textColor,  // Automatically readable text
  },
});
```

---

## Complete Component Example

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';

interface ManualCardProps {
  title: string;
  type: string;
  revision: string;
  confidence: number;
  onPress: () => void;
}

export function ManualCard({ title, type, revision, confidence, onPress }: ManualCardProps) {
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return theme.colors.success;
    if (confidence >= 0.5) return theme.colors.warning;
    return theme.colors.danger;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Ionicons 
          name="document-text" 
          size={theme.layout.iconSize} 
          color={theme.colors.primary} 
        />
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.metadata}>
        <Text style={styles.metaText}>{type} • {revision}</Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.confidenceLabel}>Confidence:</Text>
        <View style={styles.confidenceBar}>
          <View 
            style={[
              styles.confidenceFill, 
              { 
                width: `${confidence * 100}%`,
                backgroundColor: getConfidenceColor(),
              }
            ]} 
          />
        </View>
        <Text style={[styles.confidenceText, { color: getConfidenceColor() }]}>
          {confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h4,
    flex: 1,
  },
  metadata: {
    marginBottom: theme.spacing.md,
  },
  metaText: {
    ...theme.typography.caption,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  confidenceLabel: {
    ...theme.typography.bodySmall,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  confidenceText: {
    ...theme.typography.label,
    fontSize: theme.typography.fontSize.sm,
  },
});
```

---

## Best Practices

1. **Always import theme at the top:**
   ```typescript
   import { theme } from '@/utils/theme';
   ```

2. **Use theme values instead of hardcoded values:**
   ```typescript
   // ❌ Bad
   backgroundColor: '#DC2626'
   padding: 16
   
   // ✅ Good
   backgroundColor: theme.colors.primary
   padding: theme.spacing.md
   ```

3. **Use predefined typography styles:**
   ```typescript
   // ✅ Good
   <Text style={theme.typography.h2}>Title</Text>
   ```

4. **Spread shadow objects:**
   ```typescript
   // ✅ Good
   const styles = StyleSheet.create({
     card: {
       ...theme.shadows.md,
     }
   });
   ```

5. **Combine theme values:**
   ```typescript
   const styles = StyleSheet.create({
     container: {
       padding: theme.spacing.md,
       backgroundColor: theme.colors.background,
       borderRadius: theme.borderRadius.lg,
       ...theme.shadows.sm,
     }
   });
   ```

---

## Red, White, Blue Branding Examples

```typescript
// American flag-inspired header
const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,      // Red
    borderBottomWidth: 4,
    borderBottomColor: theme.colors.white,      // White
  },
  subHeader: {
    backgroundColor: theme.colors.secondary,    // Blue
  },
});

// Accent color combinations
const styles = StyleSheet.create({
  badge1: {
    backgroundColor: theme.colors.accent1,      // Red badge
  },
  badge2: {
    backgroundColor: theme.colors.accent3,      // Blue badge
    borderWidth: 2,
    borderColor: theme.colors.accent2,          // White border
  },
});
```
