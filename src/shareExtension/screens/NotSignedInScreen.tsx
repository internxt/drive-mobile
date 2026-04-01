import { Platform, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { colors, fontStyles } from '../theme';

interface NotSignedInScreenProps {
  readonly onClose: () => void;
  readonly onOpenLogin: () => void;
}

function LoginIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke={colors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NotSignedInScreen({ onClose, onOpenLogin }: NotSignedInScreenProps) {
  const tailwind = useTailwind();
  const translations = strings.screens.ShareExtension;

  return (
    <View style={tailwind('flex-1 bg-white')}>
      <View
        style={[
          tailwind('mt-2'),
          { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray20 },
        ]}
      />

      <View
        style={[
          tailwind('flex-row items-center px-4 py-3'),
          { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray10 },
        ]}
      >
        <TouchableOpacity style={tailwind('w-8 h-8 items-center justify-center')} onPress={onClose} hitSlop={8}>
          <Text style={tailwind('text-lg text-gray-60')}>✕</Text>
        </TouchableOpacity>
        <Text style={[tailwind('flex-1 text-center text-base text-gray-100'), fontStyles.semibold]}>{translations.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={[tailwind('flex-1 items-center justify-center px-6'), { paddingBottom: 36, gap: 12 }]}>
        <LoginIcon />
        <Text
          style={[
            tailwind('text-gray-100 text-center'),
            fontStyles.semibold,
            {
              fontSize: Platform.select({ ios: 36, android: 30 }),
              lineHeight: Platform.select({ ios: 44, android: 36 }),
              marginTop: 8,
            },
          ]}
        >
          {translations.notSignedIn.title}
        </Text>
        <Text
          style={[
            tailwind('text-gray-60 text-center'),
            {
              ...fontStyles.regular,
              fontSize: Platform.select({ ios: 20, android: 18 }),
              lineHeight: Platform.select({ ios: 24, android: 22 }),
            },
          ]}
        >
          {translations.notSignedIn.subtitle}
        </Text>
        <TouchableOpacity
          style={[tailwind('bg-primary rounded-xl items-center justify-center'), { alignSelf: 'stretch', paddingVertical: 16, marginTop: 12 }]}
          onPress={onOpenLogin}
        >
          <Text
            style={[
              tailwind('text-base text-white text-center'),
              fontStyles.semibold,
              { lineHeight: 20 },
            ]}
          >
            {translations.notSignedIn.openLogin}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
