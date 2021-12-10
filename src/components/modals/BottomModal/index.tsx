import React from 'react';
import { Platform, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modalbox';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../../helpers/designSystem';

export interface BottomModalProps {
  isOpen: boolean;
  onClosed: () => void;
  header?: JSX.Element;
  children?: JSX.Element | JSX.Element[];
}

const BottomModal = (props: BottomModalProps): JSX.Element => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      backButtonClose={true}
      backdropPressToClose={false}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback onPress={props.onClosed}>
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View style={tailwind('bg-white rounded-t-xl')}>
          {props.header && (
            <View style={tailwind('flex-row px-5 py-4 items-center justify-between border-b border-neutral-20')}>
              {props.header}
              <View>
                <TouchableWithoutFeedback onPress={props.onClosed}>
                  <View style={tailwind('bg-neutral-20 rounded-full h-8 w-8 justify-center items-center ml-5')}>
                    <Unicons.UilTimes color={getColor('neutral-60')} size={24} />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
          )}

          {props.children}
        </View>
      </View>
    </Modal>
  );
};

export default BottomModal;
