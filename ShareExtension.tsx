import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import secureStorageService from './src/services/SecureStorageService';
import { AsyncStorageKey } from './src/types';

// Test imports - verify that these dependencies don't crash
import { SdkManager } from './src/services/common/sdk/SdkManager';

type DependencyStatus = {
  name: string;
  status: 'pending' | 'ok' | 'error';
  detail?: string;
};

const ShareExtension = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deps, setDeps] = useState<DependencyStatus[]>([
    { name: 'SecureStorage', status: 'pending' },
    { name: 'SdkManager', status: 'pending' },
    { name: 'FolderList', status: 'pending' },
  ]);

  const updateDep = (name: string, status: 'ok' | 'error', detail?: string) => {
    setDeps((prev) => prev.map((d) => (d.name === name ? { ...d, status, detail } : d)));
  };

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);

      // Test 1: SecureStorage (already working)
      const userDataStr = await secureStorageService.getItem(AsyncStorageKey.User);
      const token = await secureStorageService.getItem(AsyncStorageKey.Token);
      const photosToken = await secureStorageService.getItem(AsyncStorageKey.PhotosToken);

      if (userDataStr && token && photosToken) {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
        updateDep('SecureStorage', 'ok');

        // Test 2: SdkManager init
        try {
          SdkManager.init({ token, newToken: photosToken });
          updateDep('SdkManager', 'ok');

          // Test 3: Fetch folders (API call)
          try {
            const sdk = SdkManager.getInstance();
            const [foldersPromise] = sdk.storageV2.getFolderFoldersByUuid(
              userData.rootFolderId as string,
              0,
              5,
              'plainName',
              'ASC',
            );
            const result = await foldersPromise;
            // result has structure { folders: [...] }
            const folderCount = result.folders?.length ?? 0;
            updateDep('FolderList', 'ok', `${folderCount} folders`);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Error fetching folders';
            updateDep('FolderList', 'error', message);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error init SDK';
          updateDep('SdkManager', 'error', message);
        }
      } else {
        setError('Complete session not found. Missing tokens.');
        updateDep('SecureStorage', 'error', 'Missing tokens');
      }
    } catch (err) {
      setError('Error connecting to shared storage.');
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateDep('SecureStorage', 'error', message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: DependencyStatus['status']) => {
    switch (status) {
      case 'ok':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.text}>Checking dependencies...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Share Extension Test</Text>

      {/* Dependency Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dependencies Status</Text>
        {deps.map((dep) => (
          <View key={dep.name} style={styles.depRow}>
            <Text style={styles.depIcon}>{getStatusIcon(dep.status)}</Text>
            <View style={styles.depInfo}>
              <Text style={styles.depName}>{dep.name}</Text>
              {dep.detail && (
                <Text style={dep.status === 'error' ? styles.depError : styles.depDetail}>{dep.detail}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* User Info */}
      {user && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User</Text>
          <Text style={styles.value}>{(user.email as string) || 'N/A'}</Text>
          <Text style={styles.label}>Root Folder:</Text>
          <Text style={styles.valueSmall}>{(user.rootFolderId as string) || 'N/A'}</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={() => console.log('Close')}>
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#091e42',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  container: {
    flex: 1,
    backgroundColor: '#091e42',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#162b4d',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9fb2d1',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  depRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  depIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  depInfo: {
    flex: 1,
  },
  depName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  depDetail: {
    color: '#4ade80',
    fontSize: 12,
    marginTop: 2,
  },
  depError: {
    color: '#ff5252',
    fontSize: 12,
    marginTop: 2,
  },
  text: {
    color: 'white',
    marginTop: 10,
  },
  label: {
    color: '#9fb2d1',
    fontSize: 11,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: 'white',
    fontSize: 14,
  },
  valueSmall: {
    color: '#ccc',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  errorText: {
    color: '#ff5252',
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#0052cc',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ShareExtension;
