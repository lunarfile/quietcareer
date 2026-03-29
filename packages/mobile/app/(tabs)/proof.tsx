import { View, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../lib/theme';

export default function ProofScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? colors.dark : colors.light;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <View style={{ flex: 1, padding: spacing.md }}>
        <Text style={{ ...typography.h1, color: c.textPrimary }}>Proof</Text>
        <Text style={{ ...typography.bodySm, color: c.textSecondary, marginTop: 4 }}>Coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}
