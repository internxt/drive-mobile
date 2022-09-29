import Portal from '@burstware/react-native-portal';
import useGetColor from '@internxt-mobile/hooks/useColor';
import strings from 'assets/lang/strings';
import { Link } from 'phosphor-react-native';
import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../../CenterModal';

export const GeneratingLinkModal: React.FC<{ isGenerating: boolean }> = ({ isGenerating }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  return (
    <Portal>
      <CenterModal
        style={tailwind('w-auto')}
        isOpen={isGenerating}
        onClosed={() => {
          return;
        }}
      >
        <View style={tailwind('flex items-center justify-center')}>
          <View style={tailwind('flex items-center justify-center')}>
            <View
              style={[
                tailwind('h-16 w-16 mt-8 mb-4 flex items-center justify-center rounded-full'),
                { backgroundColor: 'rgba(0, 102, 255, 0.05)', zIndex: 10 },
              ]}
            >
              <Link color={getColor('text-primary')} size={40} />
            </View>
          </View>

          <AppText medium style={tailwind('mb-8 text-lg mx-8')}>
            {strings.messages.generatingLink}
          </AppText>
        </View>
      </CenterModal>
    </Portal>
  );
};
