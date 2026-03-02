import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import strings from '../../../assets/lang/strings';

interface NotSignedInScreenProps {
  onClose: () => void;
  onOpenLogin: () => void;
}

function LoginIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="#0066FF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NotSignedInScreen({ onClose, onOpenLogin }: NotSignedInScreenProps) {
  const translations = strings.screens.ShareExtension;

  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{translations.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <LoginIcon />
        <Text style={styles.title}>{translations.notSignedIn.title}</Text>
        <Text style={styles.subtitle}>{translations.notSignedIn.subtitle}</Text>
        <Pressable style={styles.loginButton} onPress={onOpenLogin}>
          <Text style={styles.loginButtonText}>{translations.notSignedIn.openLogin}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#6b7280',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 32,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 12,
  },
  title: {
    fontFamily: Platform.select({ android: 'InstrumentSans-SemiBold' }),
    fontWeight: '600',
    fontSize: Platform.select({ ios: 36, android: 30 }),
    lineHeight: Platform.select({ ios: 44, android: 36 }),
    color: '#1C1C1C',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: Platform.select({ android: 'InstrumentSans-Regular' }),
    fontWeight: '400',
    fontSize: Platform.select({ ios: 20, android: 18 }),
    lineHeight: Platform.select({ ios: 24, android: 22 }),
    color: '#737373',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#0066FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loginButtonText: {
    fontFamily: Platform.select({ android: 'InstrumentSans-SemiBold' }),
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    color: '#ffffff',
  },
});
