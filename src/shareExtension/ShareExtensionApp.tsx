import { close, openHostApp } from 'expo-share-extension';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import strings from '../../assets/lang/strings';
import { NotSignedInScreen } from './screens/NotSignedInScreen';

interface ShareExtensionProps {
  isAuthenticated?: boolean;
  userEmail?: string;
  photosToken?: string;
  mnemonic?: string;
  files?: string[];
  images?: string[];
  videos?: string[];
  url?: string;
  text?: string;
}

const ShareExtensionApp = (props: ShareExtensionProps) => {
  const translations = strings.screens.ShareExtension;

  if (!props.isAuthenticated) {
    return <NotSignedInScreen onClose={close} onOpenLogin={() => openHostApp('sign-in')} />;
  }

  const allFiles = [...(props.files ?? []), ...(props.images ?? []), ...(props.videos ?? [])];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={close} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{translations.title}</Text>
        <View style={styles.closeBtn} />
      </View>
      {props.userEmail ? (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionLabel}>Signed in as</Text>
          <Text style={styles.sessionEmail}>{props.userEmail}</Text>
        </View>
      ) : null}
      {props.photosToken ? (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionLabel}>Signed new token</Text>
          <Text style={styles.sessionEmail}>{props.photosToken}</Text>
        </View>
      ) : null}
      {props.mnemonic ? (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionLabel}>Signed in with mnemonic</Text>
          <Text style={styles.sessionEmail}>{props.mnemonic}</Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        {allFiles.map((filePath) => {
          const name = filePath.split('/').pop() ?? filePath;
          return (
            <View style={styles.fileRow} key={filePath}>
              <Text style={styles.fileName} numberOfLines={1}>
                {name}
              </Text>
            </View>
          );
        })}
        {props.url ? (
          <View style={styles.fileRow}>
            <Text style={styles.fileName} numberOfLines={1}>
              {props.url}
            </Text>
          </View>
        ) : null}
        {props.text ? (
          <View style={styles.fileRow}>
            <Text style={styles.fileName} numberOfLines={2}>
              {props.text}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#6b7280',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  fileRow: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  fileName: {
    fontSize: 14,
    color: '#374151',
  },
  sessionBanner: {
    backgroundColor: '#f0f7ff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bfdbfe',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sessionLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  sessionEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066FF',
  },
});

export default ShareExtensionApp;
