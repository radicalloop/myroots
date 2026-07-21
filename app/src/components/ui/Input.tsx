import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '@/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export function Input({ label, error, hint, rightSlot, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError]}>
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, style]}
          autoCapitalize="none"
          {...props}
        />
        {rightSlot}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  inputShell: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15
  },
  inputError: {
    borderColor: theme.colors.danger
  },
  error: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600'
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12
  }
});
