import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Radius, Sizes, Spacing, Typography } from '../../theme/tokens';
import { AppHeader, useScreenInset } from '../../components/RoyalUI';

export default function LibraryScreen() {
  const { inset, isNarrow } = useScreenInset();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>Reading & audio</Text>
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
            Library
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.body}>
            Breath Prayers, Psalms of Lament, and guided urge-surfing audio paths will live here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  container: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  headingBlock: { gap: Spacing.xs },
  eyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  title: { color: Palette.light.text },
  card: {
    backgroundColor: Palette.light.surface,
    padding: Spacing.lg,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
  },
  body: { ...Typography.body, color: Palette.light.textSecondary },
});