import strings from 'assets/lang/strings';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { uiActions } from 'src/store/slices/ui';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../CenterModal';

function FileSizeExceededModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const message = useAppSelector((state) => state.ui.fileSizeExceededMessage);

  const handleClose = () => {
    dispatch(uiActions.setFileSizeExceededMessage(null));
  };

  return (
    <CenterModal isOpen={message !== null} onClosed={handleClose} style={{ overflow: 'hidden' }}>
      <View className="px-4 py-4" style={{ backgroundColor: getColor('bg-surface') }}>
        <AppText medium className="text-xl mb-2" style={{ color: getColor('text-gray-100') }}>
          {strings.modals.FileSizeExceededModal.title}
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
          {message}
        </AppText>
        <AppButton title={strings.buttons.close} type="accept" onPress={handleClose} />
      </View>
    </CenterModal>
  );
}

export default FileSizeExceededModal;
