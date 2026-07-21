import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '@/theme';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? theme.colors.white : theme.colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text` as const]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border
  },
  danger: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent'
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    transform: [{ scale: 0.98 }]
  },
  text: {
    fontSize: 15,
    fontWeight: '800'
  },
  primaryText: {
    color: theme.colors.white
  },
  secondaryText: {
    color: theme.colors.text
  },
  dangerText: {
    color: theme.colors.white
  },
  ghostText: {
    color: theme.colors.primary
  }
});
