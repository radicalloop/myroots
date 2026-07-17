import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/theme';

export function BrandHeader({ showProfile = false }: { showProfile?: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.replace('/dashboard')} style={styles.brand}>
        <View style={styles.logo}>
          <MaterialCommunityIcons name="family-tree" size={20} color={theme.colors.white} />
        </View>
        <Text style={styles.title}>MyRoots</Text>
      </Pressable>
      {showProfile ? (
        <Pressable onPress={() => router.push('/profile')} style={styles.profile}>
          <MaterialCommunityIcons name="account-circle-outline" size={21} color={theme.colors.primaryDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.primaryDark
  },
  profile: {
    height: 40,
    width: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft
  }
});
