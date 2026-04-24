import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../theme';

interface NotSignedInScreenProps {
  readonly onClose: () => void;
  readonly onOpenLogin: () => void;
}

const LoginIcon = ({ color }: { color: string }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const NotSignedInScreen = ({ onClose, onOpenLogin }: NotSignedInScreenProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  const translations = strings.screens.ShareExtension;

  return (
    <View style={[tailwind('flex-1'), { backgroundColor: colors.surface }]}>
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
          <Text style={[tailwind('text-lg'), { color: colors.gray60 }]}>✕</Text>
        </TouchableOpacity>
        <Text
          style={[
            tailwind('flex-1 text-center text-base'),
            fontStyles.semibold,
            { lineHeight: 24, color: colors.gray100 },
          ]}
        >
          {translations.title}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={[tailwind('flex-1 items-center justify-center px-6'), { paddingBottom: 36, gap: 12 }]}>
        <LoginIcon color={colors.primary} />
        <Text
          style={[
            tailwind('text-center'),
            fontStyles.semibold,
            {
              color: colors.gray100,
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
            tailwind('text-center'),
            {
              ...fontStyles.regular,
              fontSize: Platform.select({ ios: 20, android: 18 }),
              lineHeight: Platform.select({ ios: 24, android: 22 }),
              color: colors.gray60,
            },
          ]}
        >
          {translations.notSignedIn.subtitle}
        </Text>
        <TouchableOpacity
          style={[
            tailwind('rounded-xl items-center justify-center'),
            { alignSelf: 'stretch', paddingVertical: 16, marginTop: 12, backgroundColor: colors.primary },
          ]}
          onPress={onOpenLogin}
        >
          <Text
            style={[tailwind('text-base text-center'), fontStyles.semibold, { lineHeight: 20, color: colors.white }]}
          >
            {translations.notSignedIn.openLogin}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
