import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandHeader } from '@/components/BrandHeader';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useLogout, useMe, useUpdateProfile } from '@/hooks/api/useFamilyTree';
import { useAuth } from '@/providers/AuthProvider';
import { ProfileFormValues, profileSchema } from '@/validations/family-tree.validation';
import { theme } from '@/theme';

export function ProfileScreen() {
  useMe();
  const { user } = useAuth();
  const logout = useLogout();
  const updateProfile = useUpdateProfile();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? ''
    }
  });

  useEffect(() => {
    reset({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? ''
    });
  }, [reset, user?.firstName, user?.lastName]);

  return (
    <Screen protectedRoute>
      <BrandHeader />
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="account-circle-outline" size={25} color={theme.colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Update the name used across your MyRoots account.</Text>
        </View>
      </View>
      <Card style={styles.card}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="First name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.firstName?.message} />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Last name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.lastName?.message} />
          )}
        />
        <Input label="Email" value={user?.email ?? ''} editable={false} hint="Your account email cannot be changed here." />
        <Button
          title="Save changes"
          loading={updateProfile.isPending}
          disabled={!isDirty}
          onPress={handleSubmit((values) => updateProfile.mutate(values))}
        />
      </Card>
      <Button title="Sign out" variant="secondary" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  icon: {
    height: 48,
    width: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft
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
  card: {
    gap: 16
  }
});
