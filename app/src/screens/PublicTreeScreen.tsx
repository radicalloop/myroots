import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandHeader } from '@/components/BrandHeader';
import { ChatPanel } from '@/components/ChatPanel';
import { EmptyState } from '@/components/EmptyState';
import { FamilyTreeList } from '../components/FamilyTreeList';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePublicTreeView } from '@/hooks/api/useFamilyTree';
import { theme } from '@/theme';

export function PublicTreeScreen() {
  const { treeId = '' } = useLocalSearchParams<{ treeId: string }>();
  const { data: treeView, isLoading, isError, refetch } = usePublicTreeView(treeId);

  if (isLoading) return <LoadingScreen message="Loading family tree..." />;

  return (
    <Screen>
      <BrandHeader />
      {isError || !treeView ? (
        <Card style={styles.center}>
          <Text style={styles.title}>Failed to load tree</Text>
          <Text style={styles.subtitle}>Please try again or return to your dashboard.</Text>
          <Button title="Try again" variant="secondary" onPress={() => refetch()} />
        </Card>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{treeView.tree.name}</Text>
            <Text style={styles.subtitle}>Public view-only tree</Text>
          </View>
          {treeView.root ? (
            <FamilyTreeList root={treeView.root} onSelect={() => {}} />
          ) : (
            <Card>
              <EmptyState
                icon={<MaterialCommunityIcons name="tree-outline" color={theme.colors.primaryDark} size={30} />}
                title="No relatives yet"
                description="This public tree does not have people to show yet."
              />
            </Card>
          )}
          <ChatPanel treeId={treeId} treeName={treeView.tree.name} publicMode />
          <Card style={styles.authPrompt}>
            <Text style={styles.promptTitle}>Save your family story</Text>
            <Text style={styles.subtitle}>Create a free account or sign in to build your own tree.</Text>
            <View style={styles.authButtons}>
              <Button title="Create account" onPress={() => router.push('/signup')} style={styles.authButton} />
              <Button title="Sign in" variant="secondary" onPress={() => router.push('/login')} style={styles.authButton} />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20
  },
  center: {
    gap: 12,
    alignItems: 'center'
  },
  authPrompt: {
    gap: 12
  },
  promptTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  authButtons: {
    flexDirection: 'row',
    gap: 10
  },
  authButton: {
    flex: 1
  }
});
