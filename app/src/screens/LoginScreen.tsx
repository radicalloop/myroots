import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandHeader } from '@/components/BrandHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/Screen';
import { useLogin } from '@/hooks/api/useFamilyTree';
import { LoginFormValues, loginSchema } from '@/validations/family-tree.validation';
import { theme } from '@/theme';

export function LoginScreen() {
  const loginMutation = useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  return (
    <Screen contentStyle={styles.content}>
      <BrandHeader />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Preserve your family legacy</Text>
        <Text style={styles.copy}>Build family trees, discover connections, and share your heritage.</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue building your family trees</Text>
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
              placeholder="Enter your password"
              error={errors.password?.message}
            />
          )}
        />
        <Button title="Sign in" loading={loginMutation.isPending} onPress={handleSubmit((values) => loginMutation.mutate(values))} />
      </Card>
      <Pressable onPress={() => router.push('/signup')} style={styles.switch}>
        <Text style={styles.switchText}>Do not have an account? <Text style={styles.switchLink}>Create one</Text></Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 18,
    paddingBottom: 96
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
  subtitle: {
    color: theme.colors.textMuted,
    marginTop: -10
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
