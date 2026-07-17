import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Share, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ModalSheet } from '@/components/ui/ModalSheet';
import {
  useCreateTreeShare,
  useDeleteTreeShare,
  useTreeShares,
  useUpdateTreeShare
} from '@/hooks/api/useFamilyTree';
import { useToast } from '@/providers/ToastProvider';
import { CONFIG } from '@/constants/app.constants';
import { ShareFormValues, shareSchema } from '@/validations/family-tree.validation';
import { theme } from '@/theme';

interface ShareSheetProps {
  visible: boolean;
  treeId: string;
  treeName: string;
  isOwner: boolean;
  onClose: () => void;
}

export function ShareSheet({ visible, treeId, treeName, isOwner, onClose }: ShareSheetProps) {
  const { data: shares, isLoading } = useTreeShares(treeId);
  const createShare = useCreateTreeShare(treeId);
  const updateShare = useUpdateTreeShare(treeId);
  const deleteShare = useDeleteTreeShare(treeId);
  const { showToast } = useToast();
  const publicUrl = `${CONFIG.publicWebUrl}/public/tree/${treeId}`;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ShareFormValues>({
    resolver: zodResolver(shareSchema),
    defaultValues: { sharedWithEmail: '', permission: 'VIEW' }
  });

  const submitInvite = (values: ShareFormValues) => {
    createShare.mutate(values, {
      onSuccess: () => reset({ sharedWithEmail: '', permission: 'VIEW' })
    });
  };

  const sharePublicLink = async () => {
    await Clipboard.setStringAsync(publicUrl);
    showToast('View-only link copied', 'success');
    await Share.share({ message: `${treeName}\n${publicUrl}` });
  };

  const shareNativeSheet = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Share.share({ message: `${treeName}\n${publicUrl}` });
    } else {
      await Share.share({ message: `${treeName}\n${publicUrl}` });
    }
  };

  return (
    <ModalSheet visible={visible} title={`Share "${treeName}"`} onClose={onClose}>
      {isOwner ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share without email</Text>
          <Text style={styles.muted}>Anyone with this link can view only.</Text>
          <View style={styles.row}>
            <Button title="Copy link" variant="secondary" onPress={sharePublicLink} style={styles.rowButton} />
            <Button title="Share" variant="secondary" onPress={shareNativeSheet} style={styles.rowButton} />
          </View>
        </View>
      ) : null}

      {isOwner ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite by email</Text>
          <Controller
            control={control}
            name="sharedWithEmail"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Email address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                placeholder="colleague@example.com"
                error={errors.sharedWithEmail?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="permission"
            render={({ field: { value, onChange } }) => (
              <View style={styles.pickerShell}>
                <Picker selectedValue={value} onValueChange={onChange}>
                  <Picker.Item label="Can view" value="VIEW" />
                  <Picker.Item label="Can edit" value="EDIT" />
                </Picker>
              </View>
            )}
          />
          <Button title="Send invite" onPress={handleSubmit(submitInvite)} loading={createShare.isPending} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared with</Text>
        {isLoading ? <Text style={styles.muted}>Loading...</Text> : null}
        {!isLoading && (!shares || shares.length === 0) ? <Text style={styles.muted}>No shares yet</Text> : null}
        {shares?.map((share) => (
          <View key={share.id} style={styles.shareRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.email}>{share.sharedWithEmail}</Text>
              <Text style={styles.muted}>{share.status} - {share.permission === 'EDIT' ? 'Editor' : 'Viewer'}</Text>
            </View>
            {isOwner ? (
              <View style={styles.shareActions}>
                <Button
                  title={share.permission === 'EDIT' ? 'View' : 'Edit'}
                  variant="ghost"
                  onPress={() =>
                    updateShare.mutate({
                      shareId: share.id,
                      data: { permission: share.permission === 'EDIT' ? 'VIEW' : 'EDIT' }
                    })
                  }
                />
                <Button title="Remove" variant="ghost" onPress={() => deleteShare.mutate(share.id)} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  rowButton: {
    flex: 1
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden'
  },
  shareRow: {
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  email: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  shareActions: {
    flexDirection: 'row',
    gap: 8
  }
});
