import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandHeader } from '@/components/BrandHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/Screen';
import { useSignup } from '@/hooks/api/useFamilyTree';
import { SignupFormValues, signupSchema } from '@/validations/family-tree.validation';
import { theme } from '@/theme';

export function SignupScreen() {
  const signupMutation = useSignup();
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange'
  });

  return (
    <Screen contentStyle={styles.content}>
      <BrandHeader />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Start your family story</Text>
        <Text style={styles.copy}>Create your account and begin mapping your family history today.</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.title}>Create account</Text>
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
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              placeholder="you@example.com"
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              placeholder="At least 8 characters"
              hint="Use uppercase, lowercase, and a number"
              error={errors.password?.message}
            />
          )}
        />
        <Button title="Create account" loading={signupMutation.isPending} onPress={handleSubmit((values) => signupMutation.mutate(values))} />
      </Card>
      <Pressable onPress={() => router.push('/login')} style={styles.switch}>
        <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Sign in</Text></Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 18,
    paddingBottom: 120
  },
  hero: {
    gap: 8,
    paddingVertical: 8
  },
  kicker: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    gap: 16
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  switch: {
    alignItems: 'center',
    padding: 12
  },
  switchText: {
    color: theme.colors.textMuted,
    fontWeight: '700'
  },
  switchLink: {
    color: theme.colors.primaryDark
  }
});
