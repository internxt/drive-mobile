import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../types/navigation';

const AndroidShareScreen = ({ route }: RootStackScreenProps<'AndroidShare'>) => {
  const files = route.params?.files ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Save to Internxt</Text>
      <Text style={styles.count}>
        {files.length} {files.length === 1 ? 'file' : 'files'}
      </Text>

      {files.map((file, i) => (
        <View key={i} style={styles.card}>
          <Row label="Name" value={file.fileName ?? '—'} />
          <Row label="Type" value={file.mimeType ?? '—'} />
        </View>
      ))}
    </ScrollView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    width: 44,
    paddingTop: 1,
  },
  value: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
});

export default AndroidShareScreen;
