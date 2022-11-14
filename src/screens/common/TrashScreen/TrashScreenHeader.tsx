import { BackButton } from '@internxt-mobile/ui-kit';
import strings from 'assets/lang/strings';
import { Trash } from 'phosphor-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';

export type TrashScreenHeaderProps = {
  onBackButtonPress: () => void;
  onTrashButtonPress: () => void;
  emptyTrashIsDisabled: boolean;
};

export const TrashScreenHeader: React.FC<TrashScreenHeaderProps> = (props) => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind('flex justify-evenly flex-row pt-4 pb-2 ')}>
      <View style={tailwind('flex-1')}>
        <BackButton onPress={props.onBackButtonPress} label={strings.tabs.Settings} />
      </View>
      <View style={tailwind('flex-1')}>
        <AppText medium style={tailwind('text-center text-xl')}>
          {strings.screens.TrashScreen.title}
        </AppText>
      </View>
      <View style={tailwind(`flex-1 items-end justify-center ${props.emptyTrashIsDisabled ? 'opacity-50' : ''}`)}>
        <TouchableOpacity
          disabled={props.emptyTrashIsDisabled}
          onPress={props.onTrashButtonPress}
          hitSlop={INCREASED_TOUCH_AREA}
        >
          <Trash size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
