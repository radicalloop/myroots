import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandHeader } from '@/components/BrandHeader';
import { ChatPanel } from '@/components/ChatPanel';
import { EmptyState } from '@/components/EmptyState';
import { FamilyTreeList } from '../components/FamilyTreeList';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PersonDetailSheet } from '@/components/PersonDetailSheet';
import { PersonForm } from '@/components/PersonForm';
import { Screen } from '@/components/Screen';
import { ShareSheet } from '@/components/ShareSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModalSheet } from '@/components/ui/ModalSheet';
import {
  useAddParent,
  useAddSpouse,
  useCreatePerson,
  useDeletePerson,
  useDeletePersonImage,
  useMe,
  usePublicTreeView,
  useRemoveSpouse,
  useTreeView,
  useUpdatePerson,
  useUpdateTree,
  useUploadPersonImage
} from '@/hooks/api/useFamilyTree';
import { useAuth } from '@/providers/AuthProvider';
import { Gender, TreePersonNode } from '@/types/api.types';
import { PersonFormValues } from '@/validations/family-tree.validation';
import { getPersonLabel, getSpouseDefaultGender, toAddParentPayload, toPersonPayload } from '@/utils/person.utils';
import { findPersonInTree } from '@/utils/tree.utils';
import { theme } from '@/theme';

type FormMode = 'add-root' | 'add-parent' | 'add-child' | 'add-spouse' | null;

export function TreeScreen() {
  useMe();
  const { isAuthenticated } = useAuth();
  const { treeId = '' } = useLocalSearchParams<{ treeId: string }>();
  const authedTree = useTreeView(treeId, { enabled: isAuthenticated });
  const publicTree = usePublicTreeView(isAuthenticated ? '' : treeId);
  const treeView = isAuthenticated ? authedTree.data : publicTree.data;
  const isLoading = isAuthenticated ? authedTree.isLoading : publicTree.isLoading;
  const isError = isAuthenticated ? authedTree.isError : publicTree.isError;
  const refetch = isAuthenticated ? authedTree.refetch : publicTree.refetch;
  const createPerson = useCreatePerson(treeId);
  const addParent = useAddParent(treeId);
  const addSpouse = useAddSpouse(treeId);
  const removeSpouse = useRemoveSpouse(treeId);
  const updatePerson = useUpdatePerson(treeId);
  const updateTree = useUpdateTree();
  const deletePerson = useDeletePerson(treeId);
  const uploadImage = useUploadPersonImage(treeId);
  const deleteImage = useDeletePersonImage(treeId);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [treeNameDraft, setTreeNameDraft] = useState('');
  const [editingTreeName, setEditingTreeName] = useState(false);

  const activePerson = useMemo(() => {
    if (!selectedPersonId || !treeView?.root) return null;
    return findPersonInTree(treeView.root, selectedPersonId);
  }, [selectedPersonId, treeView?.root]);

  const canEdit = Boolean(isAuthenticated && (!treeView?.tree.role || treeView.tree.role !== 'VIEW'));

  const closePerson = () => setSelectedPersonId(null);
  const closeForm = () => setFormMode(null);

  const submitPersonForm = (values: PersonFormValues) => {
    if (!formMode) return;
    if (formMode === 'add-root') {
      createPerson.mutate({ ...toPersonPayload(values), is_root: true, parent_id: null }, { onSuccess: closeForm });
      return;
    }

    if (!activePerson) return;

    if (formMode === 'add-parent') {
      addParent.mutate({ personId: activePerson.id, data: toAddParentPayload(values) }, { onSuccess: closeForm });
      return;
    }

    if (formMode === 'add-child') {
      createPerson.mutate(
        { ...toPersonPayload(values), is_root: false, parent_id: activePerson.id },
        { onSuccess: closeForm }
      );
      return;
    }

    if (formMode === 'add-spouse') {
      addSpouse.mutate(
        {
          personId: activePerson.id,
          data: {
            first_name: values.first_name?.trim(),
            last_name: values.last_name?.trim(),
            gender: values.gender,
            birth_date: values.birth_date?.trim() || null,
            death_date: values.death_date?.trim() || null,
            birth_place: values.birth_place?.trim() || null,
            current_place: values.current_place?.trim() || null,
            health_note: values.health_note?.trim() || null
          }
        },
        { onSuccess: closeForm }
      );
    }
  };

  const saveTreeName = () => {
    const name = treeNameDraft.trim();
    if (!name || !treeView) return;
    updateTree.mutate(
      { treeId, data: { name } },
      {
        onSuccess: () => setEditingTreeName(false)
      }
    );
  };

  if (isLoading) return <LoadingScreen message="Loading family tree..." />;

  return (
    <Screen protectedRoute={isAuthenticated} scroll>
      <BrandHeader showProfile={isAuthenticated} />
      {isError || !treeView ? (
        <Card style={styles.center}>
          <Text style={styles.title}>Failed to load tree</Text>
          <Text style={styles.subtitle}>Please try again or return to your dashboard.</Text>
          <Button title="Try again" variant="secondary" onPress={() => refetch()} />
          <Button title="Dashboard" variant="ghost" onPress={() => router.replace('/dashboard')} />
        </Card>
      ) : (
        <>
          <View style={styles.header}>
            {editingTreeName ? (
              <View style={styles.nameEdit}>
                <TextInput
                  value={treeNameDraft}
                  onChangeText={setTreeNameDraft}
                  autoFocus
                  style={styles.nameInput}
                />
                <Button title="Save" onPress={saveTreeName} loading={updateTree.isPending} style={styles.saveNameButton} />
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{treeView.tree.name}</Text>
                <Text style={styles.subtitle}>{canEdit ? 'Tap a person to edit details or add relatives.' : 'View-only tree'}</Text>
              </View>
            )}
            {canEdit ? (
              <View style={styles.headerActions}>
                <Button
                  title="Rename"
                  variant="secondary"
                  onPress={() => {
                    setTreeNameDraft(treeView.tree.name);
                    setEditingTreeName(true);
                  }}
                  style={styles.headerButton}
                />
                <Button title="Share" variant="secondary" onPress={() => setShareOpen(true)} style={styles.headerButton} />
              </View>
            ) : null}
          </View>

          {treeView.root ? (
            <FamilyTreeList root={treeView.root} onSelect={(person) => setSelectedPersonId(person.id)} />
          ) : (
            <Card>
              <EmptyState
                icon={<MaterialCommunityIcons name="tree-outline" color={theme.colors.primaryDark} size={30} />}
                title="No root person yet"
                description={canEdit ? 'Add the first person to begin this family tree.' : 'This tree does not have people to show yet.'}
                actionLabel={canEdit ? 'Add root person' : undefined}
                onAction={canEdit ? () => setFormMode('add-root') : undefined}
              />
            </Card>
          )}

          {canEdit && treeView.root ? (
            <Button title="Add root person" variant="secondary" onPress={() => setFormMode('add-root')} />
          ) : null}

          <ChatPanel treeId={treeId} treeName={treeView.tree.name} publicMode={!isAuthenticated} />

          <PersonDetailSheet
            visible={Boolean(activePerson)}
            treeId={treeId}
            root={treeView.root}
            person={activePerson}
            canEdit={canEdit}
            updateLoading={updatePerson.isPending}
            imageUploading={uploadImage.isPending}
            imageDeleting={deleteImage.isPending}
            deleteLoading={deletePerson.isPending}
            onClose={closePerson}
            onAddParent={() => setFormMode('add-parent')}
            onAddChild={() => setFormMode('add-child')}
            onAddSpouse={() => setFormMode('add-spouse')}
            onRemoveSpouse={() => activePerson && removeSpouse.mutate(activePerson.id)}
            onDelete={(mode) => {
              if (!activePerson) return;
              deletePerson.mutate(
                { personId: activePerson.id, mode },
                {
                  onSuccess: () => {
                    closePerson();
                  }
                }
              );
            }}
            onUpdate={(payload) => activePerson && updatePerson.mutate({ personId: activePerson.id, data: payload })}
            onUploadImage={(file) => activePerson && uploadImage.mutate({ personId: activePerson.id, file })}
            onDeleteImage={() => activePerson && deleteImage.mutate(activePerson.id)}
          />

          <ModalSheet
            visible={Boolean(formMode)}
            title={formTitle(formMode, activePerson)}
            subtitle={formSubtitle(formMode, activePerson)}
            onClose={closeForm}
          >
            <PersonForm
              submitLabel={formTitle(formMode, activePerson)}
              loading={createPerson.isPending || addParent.isPending || addSpouse.isPending}
              defaultValues={
                formMode === 'add-spouse' && activePerson
                  ? { gender: getSpouseDefaultGender(activePerson.gender) }
                  : undefined
              }
              onSubmit={submitPersonForm}
            />
          </ModalSheet>

          <ShareSheet
            visible={shareOpen}
            treeId={treeId}
            treeName={treeView.tree.name}
            isOwner={!treeView.tree.role || treeView.tree.role === 'OWNER'}
            onClose={() => setShareOpen(false)}
          />
        </>
      )}
    </Screen>
  );
}

function formTitle(mode: FormMode, person: TreePersonNode | null): string {
  if (mode === 'add-root') return 'Add root person';
  if (mode === 'add-parent') return 'Add parent';
  if (mode === 'add-child') return 'Add child';
  if (mode === 'add-spouse') {
    if (person?.gender === Gender.MALE) return 'Add wife';
    if (person?.gender === Gender.FEMALE) return 'Add husband';
    return 'Add spouse';
  }
  return 'Add person';
}

function formSubtitle(mode: FormMode, person: TreePersonNode | null): string | undefined {
  if (!person) return undefined;
  if (mode === 'add-parent') return `Parent of ${getPersonLabel(person)}`;
  if (mode === 'add-child') return `Child of ${getPersonLabel(person)}`;
  if (mode === 'add-spouse') return `Spouse of ${getPersonLabel(person)}`;
  return undefined;
}

const styles = StyleSheet.create({
  header: {
    gap: 12
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
  headerActions: {
    flexDirection: 'row',
    gap: 10
  },
  headerButton: {
    flex: 1
  },
  center: {
    gap: 12,
    alignItems: 'center'
  },
  nameEdit: {
    gap: 10
  },
  nameInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontSize: 18,
    fontWeight: '800'
  },
  saveNameButton: {
    alignSelf: 'stretch'
  }
});
