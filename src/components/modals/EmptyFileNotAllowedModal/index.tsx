import strings from 'assets/lang/strings';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { uiActions } from 'src/store/slices/ui';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../CenterModal';

function EmptyFileNotAllowedModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.showEmptyFileNotAllowedModal);

  const handleClose = () => {
    dispatch(uiActions.setShowEmptyFileNotAllowedModal(false));
  };

  return (
    <CenterModal isOpen={isOpen} onClosed={handleClose} style={{ overflow: 'hidden' }}>
      <View style={[tailwind('px-4 py-4'), { backgroundColor: getColor('bg-surface') }]}>
        <AppText medium style={[tailwind('text-xl mb-2'), { color: getColor('text-gray-100') }]}>
          {strings.modals.EmptyFileNotAllowedModal.title}
        </AppText>
        <AppText
          style={[
            tailwind('mb-6'),
            {
              color: getColor('text-gray-60'),
              lineHeight: (tailwind('text-base').fontSize as number) * 1.4,
            },
          ]}
        >
          {strings.modals.EmptyFileNotAllowedModal.message}
        </AppText>
        <AppButton title={strings.buttons.close} type="accept" onPress={handleClose} />
      </View>
    </CenterModal>
  );
}

export default EmptyFileNotAllowedModal;
