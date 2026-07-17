import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gender, TreePersonNode } from '@/types/api.types';
import { theme } from '@/theme';
import { formatYearRange, getPersonLabel, initialsFor } from '@/utils/person.utils';
import { flattenPersons } from '@/utils/tree.utils';

interface FamilyTreeListProps {
  root: TreePersonNode | null;
  onSelect: (person: TreePersonNode) => void;
}

interface TreeCounts {
  men: number;
  women: number;
  total: number;
}

export function FamilyTreeList({ root, onSelect }: FamilyTreeListProps) {
  if (!root) return null;

  const counts = countTreePeople(root);

  return (
    <View style={styles.shell}>
      <View style={styles.counts}>
        <CountPill label="Men" value={counts.men} />
        <CountPill label="Women" value={counts.women} />
        <CountPill label="Total" value={counts.total} />
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.canvasScroll}
      >
        <View style={styles.canvas}>
          <TreeBranch person={root} onSelect={onSelect} isRoot />
        </View>
      </ScrollView>

      <Text style={styles.hint}>Swipe sideways to explore the tree</Text>
    </View>
  );
}

function TreeBranch({
  person,
  onSelect,
  isRoot
}: {
  person: TreePersonNode;
  onSelect: (person: TreePersonNode) => void;
  isRoot?: boolean;
}) {
  const children = person.children;

  return (
    <View style={[styles.branch, isRoot && styles.rootBranch]}>
      <CoupleNode person={person} onSelect={onSelect} />

      {children.length > 0 ? (
        <>
          <View style={styles.parentLine} />
          <View style={styles.childrenWrap}>
            <View style={styles.siblingLine} />
            <View style={styles.childrenRow}>
              {children.map((child) => (
                <View key={child.id} style={styles.childSlot}>
                  <View style={styles.childLine} />
                  <TreeBranch person={child} onSelect={onSelect} />
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

function CoupleNode({
  person,
  onSelect
}: {
  person: TreePersonNode;
  onSelect: (person: TreePersonNode) => void;
}) {
  return (
    <View style={styles.couple}>
      <PersonCard person={person} onSelect={onSelect} />
      {person.spouse ? (
        <>
          <View style={styles.spouseJoin}>
            <View style={styles.spouseLine} />
            <View style={styles.heart}>
              <MaterialCommunityIcons name="heart" size={15} color={theme.colors.danger} />
            </View>
            <View style={styles.spouseLine} />
          </View>
          <PersonCard person={person.spouse} onSelect={onSelect} spouse />
        </>
      ) : null}
    </View>
  );
}

function PersonCard({
  person,
  spouse,
  onSelect
}: {
  person: TreePersonNode;
  spouse?: boolean;
  onSelect: (person: TreePersonNode) => void;
}) {
  const years = formatYearRange(person.birth_date, person.death_date);
  const place = person.current_place || person.birth_place;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelect(person)}
      style={({ pressed }) => [
        styles.card,
        genderCardStyle(person.gender),
        spouse && styles.spouseCard,
        pressed && styles.cardPressed
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.avatar, genderAvatarStyle(person.gender)]}>
          <Text style={styles.avatarText}>{initialsFor(person)}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.name} numberOfLines={2}>
            {getPersonLabel(person)}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {person.is_root ? 'Root person' : spouse ? 'Spouse' : 'Family member'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MaterialCommunityIcons name="calendar-month-outline" size={13} color={theme.colors.textMuted} />
        <Text style={styles.meta} numberOfLines={1}>
          {years || formatGender(person.gender)}
        </Text>
      </View>

      {place ? (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {place}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.countPill}>
      <Text style={styles.countText}>{label}: {value}</Text>
    </View>
  );
}

function countTreePeople(root: TreePersonNode): TreeCounts {
  const counts: TreeCounts = { men: 0, women: 0, total: 0 };

  flattenPersons(root).forEach((person) => {
    counts.total += 1;
    if (person.gender === Gender.MALE) counts.men += 1;
    if (person.gender === Gender.FEMALE) counts.women += 1;
  });

  return counts;
}

function formatGender(gender: Gender): string {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function genderCardStyle(gender: Gender) {
  if (gender === Gender.FEMALE) return styles.femaleCard;
  if (gender === Gender.MALE) return styles.maleCard;
  return styles.otherCard;
}

function genderAvatarStyle(gender: Gender) {
  if (gender === Gender.FEMALE) return styles.femaleAvatar;
  if (gender === Gender.MALE) return styles.maleAvatar;
  return styles.otherAvatar;
}

const CARD_WIDTH = 164;
const LINE_COLOR = '#D8CDBB';

const styles = StyleSheet.create({
  shell: {
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 12,
    overflow: 'hidden'
  },
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12
  },
  countPill: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  countText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  canvasScroll: {
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  canvas: {
    minWidth: 340,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6
  },
  branch: {
    alignItems: 'center'
  },
  rootBranch: {
    paddingTop: 4
  },
  couple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 11,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88
  },
  maleCard: {
    borderColor: '#9CC9EF'
  },
  femaleCard: {
    borderColor: '#F2ABC7'
  },
  otherCard: {
    borderColor: '#BDAFEF'
  },
  spouseCard: {
    backgroundColor: '#FFFEFB'
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9
  },
  avatar: {
    height: 42,
    width: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  maleAvatar: {
    backgroundColor: '#367DB8'
  },
  femaleAvatar: {
    backgroundColor: '#D94F87'
  },
  otherAvatar: {
    backgroundColor: '#7664C8'
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '900'
  },
  cardText: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
    textTransform: 'capitalize'
  },
  role: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2
  },
  metaRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  meta: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  spouseJoin: {
    width: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spouseLine: {
    flex: 1,
    height: 2,
    backgroundColor: LINE_COLOR
  },
  heart: {
    height: 26,
    width: 26,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F4C9D2',
    backgroundColor: '#FFF1F4'
  },
  parentLine: {
    width: 2,
    height: 26,
    backgroundColor: LINE_COLOR
  },
  childrenWrap: {
    alignItems: 'center',
    position: 'relative'
  },
  siblingLine: {
    position: 'absolute',
    top: 0,
    left: CARD_WIDTH / 2,
    right: CARD_WIDTH / 2,
    height: 2,
    backgroundColor: LINE_COLOR
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 18
  },
  childSlot: {
    alignItems: 'center',
    paddingTop: 0
  },
  childLine: {
    width: 2,
    height: 24,
    backgroundColor: LINE_COLOR
  },
  hint: {
    paddingHorizontal: 12,
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  }
});
