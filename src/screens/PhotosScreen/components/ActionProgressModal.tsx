import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';

interface ActionProgressModalProps {
  visible: boolean;
  label: string;
}

const ActionProgressModal = ({ visible, label }: ActionProgressModalProps): JSX.Element | null => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: getColor('bg-surface') }]}>
        <ActivityIndicator size="large" color={getColor('text-primary')} />
        <AppText style={[tailwind('mt-4 text-base text-center'), { color: getColor('text-gray-80') }]}>{label}</AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default ActionProgressModal;
