import { StyleSheet, Text, View } from 'react-native';

// Placeholder body for tabs whose real feature lands in a later pass.
export default function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note ?? 'This feature is coming soon.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  note: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
