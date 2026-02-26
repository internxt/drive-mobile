import { File } from 'expo-file-system';
import { close, type InitialProps } from 'expo-share-extension';
import prettysize from 'prettysize';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface FileRow {
  path: string;
  name: string;
  size: string | null;
}

function buildRow(path: string): FileRow {
  const name = path.split('/').pop() ?? path;
  try {
    const file = new File(path);
    const size = file.exists && file.size > 0 ? prettysize(file.size) : null;
    return { path, name, size };
  } catch {
    return { path, name, size: null };
  }
}

const ShareExtensionApp = (props: InitialProps) => {
  const rows = [...(props.files ?? []), ...(props.images ?? []), ...(props.videos ?? [])].map(buildRow);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.closeButton} onPress={close}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <Text style={styles.title}>Save to Internxt</Text>
      <Text style={styles.count}>
        {rows.length} {rows.length === 1 ? 'file' : 'files'}
      </Text>

      {rows.map((file, i) => (
        <View key={i} style={styles.card}>
          <Row label="Name" value={file.name} />
          <Row label="Path" value={file.path} />
          {file.size && <Row label="Size" value={file.size} />}
        </View>
      ))}

      {props.text && (
        <View style={styles.card}>
          <Row label="Text" value={props.text} />
        </View>
      )}
      {props.url && (
        <View style={styles.card}>
          <Row label="URL" value={props.url} />
        </View>
      )}
    </ScrollView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={3}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#374151',
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

export default ShareExtensionApp;
