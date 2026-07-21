import { ReactNode, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ScreenProps {
  children: ReactNode;
  protectedRoute?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

export function Screen({ children, protectedRoute, scroll = true, contentStyle }: ScreenProps) {
  const { isHydrating, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isHydrating && protectedRoute && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrating, protectedRoute]);

  if (isHydrating || (protectedRoute && !isAuthenticated)) {
    return <LoadingScreen message="Checking your session..." />;
  }

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.keyboard}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  keyboard: {
    flex: 1
  },
  content: {
    padding: 18,
    gap: 18
  }
});
