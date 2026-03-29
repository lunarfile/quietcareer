import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../lib/theme';
import { Shield, Flame, Trophy } from 'lucide-react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? colors.dark : colors.light;

  // TODO: Wire to database queries
  const greeting = getGreeting();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ ...typography.h1, color: c.textPrimary }}>
            {greeting}.
          </Text>
          <Text style={{ ...typography.bodySm, color: c.textSecondary, marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Risk Badge placeholder */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 9999,
          backgroundColor: isDark ? 'rgba(74,158,107,0.1)' : 'rgba(58,142,91,0.1)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(74,158,107,0.3)' : 'rgba(58,142,91,0.3)',
          alignSelf: 'flex-start',
          marginBottom: spacing.lg,
        }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.success }} />
          <Text style={{ ...typography.bodySm, color: c.successText, fontWeight: '600' }}>
            Low Risk
          </Text>
        </View>

        {/* Streak + Proof Bank */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{
            flex: 1,
            backgroundColor: c.bgSecondary,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: c.surfaceBorder,
            padding: spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Flame size={14} color={c.warning} />
              <Text style={{ ...typography.overline, color: c.textTertiary, textTransform: 'uppercase' }}>
                Streak
              </Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: c.textPrimary, fontVariant: ['tabular-nums'] }}>
              0
            </Text>
            <Text style={{ ...typography.caption, color: c.textTertiary }}>days</Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: c.bgSecondary,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: c.surfaceBorder,
            padding: spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Trophy size={14} color={c.accent} />
              <Text style={{ ...typography.overline, color: c.textTertiary, textTransform: 'uppercase' }}>
                Proof Bank
              </Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: c.textPrimary, fontVariant: ['tabular-nums'] }}>
              0
            </Text>
            <Text style={{ ...typography.caption, color: c.textTertiary }}>career assets</Text>
          </View>
        </View>

        {/* Empty state */}
        <View style={{
          alignItems: 'center',
          paddingVertical: spacing.xxl,
        }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: c.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}>
            <Shield size={28} color={c.accent} />
          </View>
          <Text style={{ ...typography.h3, color: c.textPrimary, marginBottom: spacing.xs, textAlign: 'center' }}>
            Your field notes start here.
          </Text>
          <Text style={{ ...typography.bodySm, color: c.textSecondary, textAlign: 'center', maxWidth: 280, lineHeight: 20 }}>
            Write what happened at work today. One sentence is enough. Over time, this becomes the most valuable file you own.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
