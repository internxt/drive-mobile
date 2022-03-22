import { X } from 'phosphor-react-native';
import React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import Modal from 'react-native-modalbox';
import { tailwind } from '../../../helpers/designSystem';

function UpdateModal(): JSX.Element {
  return (
    <Modal
      style={tailwind('rounded-3xl h-3/6 w-4/5 p-4')}
      backButtonClose={false}
      backdropPressToClose={false}
      isOpen={false}
    >
      <View style={tailwind('h-full')}>
        <View style={tailwind('flex-grow')}>
          <View style={tailwind('h-12 flex')}>
            <TouchableWithoutFeedback onPress={() => undefined}>
              <View style={tailwind('bg-neutral-20 rounded-full p-1 self-end m-3')}>
                <X color={'#B3BAC5'} />
              </View>
            </TouchableWithoutFeedback>
          </View>

          <View style={tailwind('items-center')}>
            <Text style={tailwind('font-bold text-neutral-500 text-xl')}>New version available</Text>
          </View>
          <View style={tailwind('flex-grow p-3 mx-3 justify-center')}>
            <Text style={tailwind('text-center text-neutral-500')}>
              A new version is available, please upgrade the app to receive brand new awesome changes
            </Text>
          </View>
        </View>
        <View>
          <TouchableWithoutFeedback onPress={() => undefined}>
            <View style={tailwind('btn bg-blue-60 w-full')}>
              <Text style={tailwind('btn-label text-xl')}>Update and restart</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    </Modal>
  );
}

export default UpdateModal;
