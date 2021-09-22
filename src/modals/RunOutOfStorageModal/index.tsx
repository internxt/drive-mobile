import React from 'react';
import { Text, View, TouchableWithoutFeedback } from 'react-native';
import Modal from 'react-native-modalbox';
import { Reducers } from '../../redux/reducers/reducers';
import RunOutImage from '../../../assets/images/modals/runout.svg'
import { connect, useSelector } from 'react-redux';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons'
import { layoutActions } from '../../redux/actions';

function RunOutOfStorageModal(props: Reducers): JSX.Element {
  const { layoutState } = useSelector<any, Reducers>(s => s);

  return <Modal
    isOpen={layoutState.showRunOutOfSpaceModal}
    position={'center'}
    entry={'bottom'}
    animationDuration={200}
    style={tailwind('rounded-3xl h-3/6 w-4/5')}
    coverScreen={false}>
    <View style={tailwind('h-12 flex')}>
      <TouchableWithoutFeedback onPress={() => {
        props.dispatch(layoutActions.closeRunOutStorageModal())
      }}>
        <View style={tailwind('bg-neutral-20 rounded-full p-1 self-end m-3')}>
          <Unicons.UilTimes color={'#B3BAC5'} />
        </View>
      </TouchableWithoutFeedback>
    </View>
    <View style={tailwind('items-center')}>
      <RunOutImage width={100} height={100} />
    </View>
    <View style={tailwind('items-center')}>
      <View>
        <Text style={tailwind('font-bold text-neutral-500')}>Run out of storage</Text>
      </View>
      <View>
        {/* <Text>Holoa</Text> */}
      </View>
    </View>
    <View style={tailwind('flex-grow p-3 mx-3')}>
      <Text style={tailwind('text-center text-neutral-500')}>You won’t be able to upload or sync big size files. Upgrade to a higher plan or remove files you will no longer use.</Text>
    </View>
    <View style={tailwind('items-center px-3')}>
      <TouchableWithoutFeedback onPress={() => {
        props.dispatch(layoutActions.closeRunOutStorageModal());
        props.navigation.push('Billing')

      }}>
        <View style={tailwind('btn bg-blue-60 w-full m-3')}>
          <Text style={tailwind('btn-label')}>Upgrade now</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </Modal>
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(RunOutOfStorageModal)