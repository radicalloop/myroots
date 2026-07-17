import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { Button } from '@/components/ui/Button';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32
  },
  icon: {
    height: 56,
    width: 56,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center'
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  action: {
    marginTop: 8,
    alignSelf: 'stretch'
  }
});
