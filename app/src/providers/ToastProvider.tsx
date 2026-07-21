import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';

type ToastKind = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.wrapper}>
          <Animated.View
            style={[
              styles.toast,
              toast.kind === 'success' && styles.success,
              toast.kind === 'error' && styles.error
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 34,
    zIndex: 1000
  },
  toast: {
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.text
  },
  success: {
    backgroundColor: theme.colors.success
  },
  error: {
    backgroundColor: theme.colors.danger
  },
  toastText: {
    color: theme.colors.white,
    fontWeight: '700',
    textAlign: 'center'
  }
});
