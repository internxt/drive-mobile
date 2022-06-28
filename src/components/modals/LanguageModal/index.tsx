import { CheckCircle, Circle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import useGetColor from 'src/hooks/useColor';
import { appThunks } from 'src/store/slices/app';
import { Language } from 'src/types';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch } from '../../../store/hooks';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import BottomModal from '../BottomModal';

const LanguageModal = (props: BaseModalProps) => {
  const dispatch = useAppDispatch();
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState(strings.getLanguage());
  const isDirty = language !== strings.getLanguage();
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onApplyButtonPressed = async () => {
    setIsLoading(true);
    dispatch(appThunks.changeLanguageThunk(language as Language))
      .unwrap()
      .then(() => {
        props.onClose();
      })
      .catch(() => undefined)
      .finally(() => {
        setIsLoading(false);
      });
  };
  const renderRadioButtons = () =>
    Object.values(Language).map((l, index) => {
      const isSelected = language === l;
      const isTheLast = index === Object.values(Language).length - 1;
      const onPress = () => {
        setLanguage(l);
      };

      return (
        <TouchableOpacity key={l} onPress={onPress}>
          <View>
            <View style={tailwind('flex-row items-center')}>
              <View style={tailwind('px-2.5')}>
                {isSelected ? (
                  <CheckCircle weight="fill" color={getColor('text-primary')} />
                ) : (
                  <Circle weight="thin" color={getColor('text-gray-20')} />
                )}
              </View>

              <View style={[tailwind('w-full mr-4 pl-2.5 py-2.5')]}>
                <AppText style={[tailwind('text-lg'), isSelected && tailwind('text-primary')]}>
                  {strings.getString('languages.' + l, l)}
                </AppText>
                <AppText style={tailwind('text-xs text-gray-60')}>{strings.languages[l]}</AppText>
              </View>
            </View>

            {!isTheLast && <View style={[{ height: 1 }, tailwind('ml-12 bg-gray-5')]} />}
          </View>
        </TouchableOpacity>
      );
    });

  useEffect(() => {
    if (props.isOpen) {
      setLanguage(strings.getLanguage());
    }
  }, [props.isOpen]);

  return (
    <BottomModal
      isOpen={props.isOpen}
      onClosed={props.onClose}
      topDecoration
      backdropPressToClose={!isLoading}
      backButtonClose={!isLoading}
    >
      <View style={tailwind('px-4 pb-4')}>
        <AppText style={tailwind('text-center')} semibold>
          {strings.modals.Language.title.toUpperCase()}
        </AppText>

        <View style={tailwind('my-6')}>{renderRadioButtons()}</View>

        <View style={tailwind('flex-row')}>
          <AppButton
            style={tailwind('flex-1 mr-1.5')}
            onPress={onCancelButtonPressed}
            title={strings.buttons.cancel}
            type="cancel"
            disabled={isLoading}
          />
          <AppButton
            style={tailwind('flex-1')}
            onPress={onApplyButtonPressed}
            title={isLoading ? strings.buttons.applying : strings.buttons.apply}
            disabled={!isDirty || isLoading}
            loading={isLoading}
            type="accept"
          />
        </View>
      </View>
    </BottomModal>
  );
};

export default LanguageModal;
