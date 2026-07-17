import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { theme } from '@/theme';
import { Tree } from '@/types/api.types';

interface TreeCardProps {
  tree: Tree;
  onShare?: (tree: Tree) => void;
  onDelete?: (tree: Tree) => void;
  deleteLoading?: boolean;
}

export function TreeCard({ tree, onShare, onDelete, deleteLoading }: TreeCardProps) {
  const counts = tree.counts ?? { men: 0, women: 0, total: 0 };
  const isOwner = !tree.role || tree.role === 'OWNER';

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="tree-outline" size={24} color={theme.colors.primaryDark} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{tree.name}</Text>
            {tree.role && tree.role !== 'OWNER' ? (
              <Text style={styles.role}>{tree.role === 'EDIT' ? 'Editor' : 'Viewer'}</Text>
            ) : null}
          </View>
          {tree.description ? <Text style={styles.description} numberOfLines={2}>{tree.description}</Text> : null}
          {tree.sharedByEmail ? <Text style={styles.shared}>Shared by {tree.sharedByEmail}</Text> : null}
        </View>
      </View>
      <View style={styles.counts}>
        <Text style={styles.count}>Men: {counts.men}</Text>
        <Text style={styles.count}>Women: {counts.women}</Text>
        <Text style={styles.count}>Total: {counts.total}</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Open" onPress={() => router.push(`/tree/${tree.id}`)} style={styles.open} />
        {isOwner && onShare ? (
          <Pressable onPress={() => onShare(tree)} style={styles.iconButton}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={theme.colors.primaryDark} />
          </Pressable>
        ) : null}
        {isOwner && onDelete ? (
          <Pressable disabled={deleteLoading} onPress={() => onDelete(tree)} style={styles.iconButton}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.danger} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    gap: 12
  },
  icon: {
    height: 44,
    width: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft
  },
  body: {
    flex: 1,
    gap: 4
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  name: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  role: {
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: '900'
  },
  description: {
    color: theme.colors.textMuted,
    lineHeight: 19
  },
  shared: {
    color: theme.colors.textMuted,
    fontSize: 12
  },
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14
  },
  count: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  open: {
    flex: 1
  },
  iconButton: {
    height: 48,
    width: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  }
});
