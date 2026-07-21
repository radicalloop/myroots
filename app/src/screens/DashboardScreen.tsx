import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandHeader } from '@/components/BrandHeader';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ShareSheet } from '@/components/ShareSheet';
import { TreeCard } from '@/components/TreeCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useCreateTree, useDeleteTree, useMe, useTrees } from '@/hooks/api/useFamilyTree';
import { Tree } from '@/types/api.types';
import { TreeFormValues, treeSchema } from '@/validations/family-tree.validation';
import { theme } from '@/theme';

export function DashboardScreen() {
  useMe();
  const { data: trees, isLoading, isError, refetch } = useTrees();
  const createTreeMutation = useCreateTree();
  const deleteTreeMutation = useDeleteTree();
  const [showForm, setShowForm] = useState(false);
  const [shareTarget, setShareTarget] = useState<Tree | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TreeFormValues>({
    resolver: zodResolver(treeSchema),
    defaultValues: { name: '', description: '' }
  });

  const { ownedTrees, sharedTrees } = useMemo(() => {
    return {
      ownedTrees: (trees ?? []).filter((tree) => !tree.role || tree.role === 'OWNER'),
      sharedTrees: (trees ?? []).filter((tree) => tree.role && tree.role !== 'OWNER')
    };
  }, [trees]);

  const submitTree = (values: TreeFormValues) => {
    createTreeMutation.mutate(values, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      }
    });
  };

  const confirmDelete = (tree: Tree) => {
    Alert.alert('Delete tree?', `This will permanently delete "${tree.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTreeMutation.mutate(tree.id) }
    ]);
  };

  if (isLoading) return <LoadingScreen message="Loading your trees..." />;

  return (
    <Screen protectedRoute>
      <BrandHeader showProfile />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your family trees</Text>
          <Text style={styles.subtitle}>Create, manage, and explore your family heritage</Text>
        </View>
        {(trees?.length ?? 0) > 0 ? <Button title="New" onPress={() => setShowForm(true)} style={styles.newButton} /> : null}
      </View>

      {isError ? (
        <Card style={styles.error}>
          <Text style={styles.errorTitle}>Failed to load trees</Text>
          <Button title="Try again" variant="secondary" onPress={() => refetch()} />
        </Card>
      ) : null}

      {showForm ? (
        <Card style={styles.form}>
          <Text style={styles.formTitle}>Create a new tree</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input label="Tree name" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="The Smith Family" error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input label="Description" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} placeholder="Optional description" />
            )}
          />
          <Button title="Create tree" loading={createTreeMutation.isPending} onPress={handleSubmit(submitTree)} />
          {(trees?.length ?? 0) > 0 ? <Button title="Cancel" variant="ghost" onPress={() => setShowForm(false)} /> : null}
        </Card>
      ) : null}

      {!showForm && (trees?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<MaterialCommunityIcons name="tree-outline" color={theme.colors.primaryDark} size={30} />}
            title="No family trees yet"
            description="Create your first family tree to start mapping your heritage."
            actionLabel="Create your first tree"
            onAction={() => setShowForm(true)}
          />
        </Card>
      ) : null}

      {ownedTrees.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My trees</Text>
          {ownedTrees.map((tree) => (
            <TreeCard
              key={tree.id}
              tree={tree}
              onShare={setShareTarget}
              onDelete={confirmDelete}
              deleteLoading={deleteTreeMutation.isPending}
            />
          ))}
        </View>
      ) : null}

      {sharedTrees.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared with me</Text>
          {sharedTrees.map((tree) => (
            <TreeCard key={tree.id} tree={tree} />
          ))}
        </View>
      ) : null}

      {shareTarget ? (
        <ShareSheet
          visible
          treeId={shareTarget.id}
          treeName={shareTarget.name}
          isOwner={!shareTarget.role || shareTarget.role === 'OWNER'}
          onClose={() => setShareTarget(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: 3
  },
  newButton: {
    minWidth: 82
  },
  form: {
    gap: 14
  },
  formTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  error: {
    gap: 12
  },
  errorTitle: {
    color: theme.colors.danger,
    fontWeight: '900'
  }
});
