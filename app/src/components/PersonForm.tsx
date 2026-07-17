import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Gender } from '@/types/api.types';
import { personSchema, PersonFormValues } from '@/validations/family-tree.validation';
import { theme } from '@/theme';

interface PersonFormProps {
  defaultValues?: Partial<PersonFormValues>;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (values: PersonFormValues) => void;
}

export function PersonForm({ defaultValues, submitLabel, loading, onSubmit }: PersonFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    mode: 'onTouched',
    defaultValues: {
      first_name: '',
      last_name: '',
      gender: Gender.MALE,
      birth_date: '',
      death_date: '',
      birth_place: '',
      current_place: '',
      health_note: '',
      ...defaultValues
    }
  });

  return (
    <View style={styles.form}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal details</Text>
        <Controller
          control={control}
          name="first_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="First name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.first_name?.message} />
          )}
        />
        <Controller
          control={control}
          name="last_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Last name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.last_name?.message} />
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field: { value, onChange } }) => (
            <View style={styles.pickerGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.pickerShell}>
                <Picker selectedValue={value} onValueChange={onChange}>
                  {Object.values(Gender).map((gender) => (
                    <Picker.Item key={gender} label={formatGender(gender)} value={gender} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dates and places</Text>
        <Controller
          control={control}
          name="birth_date"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Birth date"
              placeholder="YYYY-MM-DD"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.birth_date?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="death_date"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Death date"
              placeholder="YYYY-MM-DD"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.death_date?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="birth_place"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Birth place" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} placeholder="City, Country" />
          )}
        />
        <Controller
          control={control}
          name="current_place"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Current place" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} placeholder="City, Country" />
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health note</Text>
        <Controller
          control={control}
          name="health_note"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Note"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={4}
              placeholder="Any relevant health information..."
            />
          )}
        />
      </View>

      <Button title={submitLabel} onPress={handleSubmit(onSubmit)} loading={loading} />
    </View>
  );
}

function formatGender(gender: Gender): string {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  form: {
    gap: 16
  },
  section: {
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  pickerGroup: {
    gap: 6
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  pickerShell: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface
  }
});
