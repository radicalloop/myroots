import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Screen } from '@/components/Screen';
import { useAcceptShare } from '@/hooks/api/useFamilyTree';
import { getErrorMessage } from '@/api/client';
import { theme } from '@/theme';

export function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const acceptShare = useAcceptShare();
  const acceptShareMutate = acceptShare.mutate;

  useEffect(() => {
    if (token) acceptShareMutate(token);
  }, [acceptShareMutate, token]);

  if (acceptShare.isPending || (!acceptShare.isError && !acceptShare.isSuccess)) {
    return <LoadingScreen message="Accepting invite..." />;
  }

  return (
    <Screen protectedRoute contentStyle={styles.content}>
      <Card style={styles.card}>
        {acceptShare.isSuccess ? (
          <>
            <MaterialCommunityIcons name="check-circle-outline" size={56} color={theme.colors.success} />
            <Text style={styles.title}>Tree added</Text>
            <Text style={styles.text}>Opening your shared tree...</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="close-circle-outline" size={56} color={theme.colors.danger} />
            <Text style={styles.title}>Invite could not be accepted</Text>
            <Text style={styles.text}>{getErrorMessage(acceptShare.error)}</Text>
            <Button title="Go to dashboard" variant="secondary" onPress={() => router.replace('/dashboard')} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  card: {
    alignItems: 'center',
    gap: 14
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center'
  },
  text: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20
  }
});
