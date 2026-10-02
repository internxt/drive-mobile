import { Icon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import LockBadgeIcon from './LockBadgeIcon';

export type LockedFeatureTexts = {
  title: string;
  body: string;
  upgradeLine?: string;
};

interface LockedFeatureOverlayProps {
  icon: Icon;
  texts: LockedFeatureTexts;
  locked?: boolean;
  action?: { label: string; onPress: () => void };
}

const LockedFeatureOverlay = ({
  icon: FeatureIcon,
  texts,
  locked = true,
  action,
}: LockedFeatureOverlayProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.backdrop]}>
      <View style={[styles.card, { backgroundColor: getColor('bg-surface'), borderColor: getColor('border-gray-10') }]}>
        <View
          style={[styles.iconTile, { backgroundColor: getColor('bg-gray-1'), borderColor: getColor('border-gray-10') }]}
        >
          <FeatureIcon size={64} color={getColor('text-primary')} weight="regular" />
          {locked && (
            <View style={styles.lockBadge}>
              <LockBadgeIcon size={32} />
            </View>
          )}
        </View>

        <View style={[tailwind('items-center w-full'), styles.textStack]}>
          <AppText semibold style={[tailwind('text-xl text-center'), { color: getColor('text-gray-100') }]}>
            {texts.title}
          </AppText>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>{texts.body}</AppText>
          {!!texts.upgradeLine && (
            <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>
              {texts.upgradeLine}
            </AppText>
          )}
        </View>
        {action && <AppButton type="accept" title={action.label} onPress={action.onPress} style={styles.action} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  textStack: {
    gap: 8,
  },
  action: {
    alignSelf: 'stretch',
  },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -16,
    left: -16,
  },
});

export default LockedFeatureOverlay;
