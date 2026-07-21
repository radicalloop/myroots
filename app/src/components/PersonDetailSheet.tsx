import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { theme } from '@/theme';
import { Gender, TreePersonNode, UpdatePersonPayload } from '@/types/api.types';
import { formatDate, getPersonLabel, getSpouseDefaultGender, initialsFor } from '@/utils/person.utils';
import { getFamilyChildrenForPerson } from '@/utils/tree.utils';

interface PersonDetailSheetProps {
  visible: boolean;
  treeId: string;
  root: TreePersonNode | null;
  person: TreePersonNode | null;
  canEdit: boolean;
  updateLoading?: boolean;
  imageUploading?: boolean;
  imageDeleting?: boolean;
  deleteLoading?: boolean;
  onClose: () => void;
  onAddParent: () => void;
  onAddChild: () => void;
  onAddSpouse: () => void;
  onRemoveSpouse: () => void;
  onDelete: (mode: 'person' | 'branch') => void;
  onUpdate: (payload: UpdatePersonPayload) => void;
  onUploadImage: (file: { uri: string; mimeType: string; name: string; size?: number }) => void;
  onDeleteImage: () => void;
}

export function PersonDetailSheet({
  visible,
  root,
  person,
  canEdit,
  updateLoading,
  imageUploading,
  imageDeleting,
  deleteLoading,
  onClose,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onRemoveSpouse,
  onDelete,
  onUpdate,
  onUploadImage,
  onDeleteImage
}: PersonDetailSheetProps) {
  const children = root && person ? getFamilyChildrenForPerson(root, person) : [];

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1]
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onUploadImage({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? `${person?.id ?? 'person'}-profile.jpg`,
      size: asset.fileSize
    });
  };

  if (!person) {
    return (
      <ModalSheet visible={visible} title="Person" onClose={onClose}>
        <Text>Person not found.</Text>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet visible={visible} title={getPersonLabel(person)} subtitle={formatDate(person.birth_date)} onClose={onClose}>
      <View style={styles.profile}>
        {person.profile_image_url ? (
          <Image source={{ uri: person.profile_image_url }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.photoText}>{initialsFor(person)}</Text>
          </View>
        )}
        {canEdit ? (
          <View style={styles.photoActions}>
            <Button title="Photo" variant="secondary" onPress={pickImage} loading={imageUploading} style={styles.smallAction} />
            {person.profile_image_path ? (
              <Button title="Remove" variant="ghost" onPress={onDeleteImage} loading={imageDeleting} style={styles.smallAction} />
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.detailsGrid}>
        <Detail label="Gender" value={formatGender(person.gender)} onPress={() => cycleGender(person.gender, onUpdate)} editable={canEdit} />
        <Detail label="Born" value={formatDate(person.birth_date) || 'Not set'} />
        <Detail label="Died" value={formatDate(person.death_date) || 'Not set'} />
        <Detail label="Birthplace" value={person.birth_place || 'Not set'} />
        <Detail label="Lives in" value={person.current_place || 'Not set'} />
      </View>

      <View style={styles.note}>
        <Text style={styles.sectionTitle}>Health note</Text>
        <Text style={styles.noteText}>{person.health_note || 'No health note added.'}</Text>
      </View>

      {children.length > 0 ? (
        <View style={styles.note}>
          <Text style={styles.sectionTitle}>Children</Text>
          {children.map((child) => (
            <Text key={child.id} style={styles.childName}>{getPersonLabel(child)}</Text>
          ))}
        </View>
      ) : null}

      {canEdit ? (
        <View style={styles.actions}>
          <Button title="Add parent" onPress={onAddParent} />
          <Button title="Add child" variant="secondary" onPress={onAddChild} />
          {person.spouse ? (
            <Button title="Remove spouse" variant="secondary" onPress={onRemoveSpouse} />
          ) : (
            <Button
              title={person.gender === Gender.MALE ? 'Add wife' : person.gender === Gender.FEMALE ? 'Add husband' : 'Add spouse'}
              variant="secondary"
              onPress={onAddSpouse}
            />
          )}
          <Button
            title="Delete person"
            variant="danger"
            loading={deleteLoading}
            onPress={() =>
              Alert.alert('Delete person?', 'Remove this person only, or delete this whole branch?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Person only', style: 'destructive', onPress: () => onDelete('person') },
                { text: 'Whole branch', style: 'destructive', onPress: () => onDelete('branch') }
              ])
            }
          />
        </View>
      ) : null}
      {updateLoading ? <Text style={styles.saving}>Saving changes...</Text> : null}
    </ModalSheet>
  );
}

function Detail({
  label,
  value,
  editable,
  onPress
}: {
  label: string;
  value: string;
  editable?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!editable} onPress={onPress} style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, editable && styles.editable]}>{value}</Text>
    </Pressable>
  );
}

function formatGender(gender: Gender): string {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function cycleGender(current: Gender, onUpdate: (payload: UpdatePersonPayload) => void) {
  const next = current === Gender.MALE ? Gender.FEMALE : current === Gender.FEMALE ? Gender.OTHER : Gender.MALE;
  onUpdate({ gender: next || getSpouseDefaultGender(current) });
}

const styles = StyleSheet.create({
  profile: {
    alignItems: 'center',
    gap: 12
  },
  photo: {
    height: 96,
    width: 96,
    borderRadius: 48
  },
  photoFallback: {
    height: 96,
    width: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary
  },
  photoText: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '900'
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8
  },
  smallAction: {
    minWidth: 112
  },
  detailsGrid: {
    gap: 10
  },
  detail: {
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  detailValue: {
    marginTop: 3,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  editable: {
    color: theme.colors.primaryDark
  },
  note: {
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6
  },
  noteText: {
    color: theme.colors.textMuted,
    lineHeight: 20
  },
  childName: {
    color: theme.colors.text,
    fontWeight: '700',
    paddingVertical: 3
  },
  actions: {
    gap: 10
  },
  saving: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontWeight: '700'
  }
});
