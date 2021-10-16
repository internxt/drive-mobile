import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import { Text, View, Platform, TouchableWithoutFeedback, TouchableHighlight } from 'react-native';
import Modal from 'react-native-modalbox';
import { Reducers } from '../../redux/reducers/reducers';
import RunOutImage from '../../../assets/images/modals/runout.svg'
import { connect, useSelector } from 'react-redux';
import { tailwind, getColor } from '../../helpers/designSystem';
import { layoutActions } from '../../redux/actions';
import globalStyle from '../../styles/global.style';
import strings from '../../../assets/lang/strings';
import { getCurrentIndividualPlan } from '../../services/payments';
import { loadValues } from '../../modals';
import { notify } from '../../helpers';

interface StorageProps extends Reducers {
  currentPlan: number
}

interface CurrentPlan {
  name: string
  storageLimit: number
}

function RunOutOfStorageModal(props: Reducers): JSX.Element {
  const { layoutState } = useSelector<any, Reducers>(s => s);

  const [usageValues, setUsageValues] = useState({ usage: 0, limit: 0 })
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>();

  const parseLimit = () => {

    if (usageValues.limit === 0) {
      return '...';
    }

    const infinitePlan = Math.pow(1024, 4) * 99; // 99TB

    if (usageValues.limit >= infinitePlan) {
      return '\u221E';
    }

    return prettysize(usageValues.limit, true);
  }

  useEffect(() => {
    loadValues().then(res => setUsageValues(res)).catch(() => { })

    getCurrentIndividualPlan().then(setCurrentPlan).catch(err => {

      notify({
        text: 'Cannot load current plan',
        type: 'warn'
      })
    })
  }, [])

  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={layoutState.showRunOutOfSpaceModal}
      onClosed={() => {
        props.dispatch(layoutActions.closeDeleteModal())
        props.dispatch(layoutActions.closeRanOutStorageModal())
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback
          style={tailwind('flex-grow')}
          onPress={() => {
            props.dispatch(layoutActions.closeRanOutStorageModal());
          }}
        >
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View>

          <View style={tailwind('flex-row bg-white px-5 py-3 rounded-t-xl justify-center')}>
            <View style={tailwind('h-1 w-20 bg-neutral-30 rounded-full')} />
          </View>

          <View style={tailwind('bg-white justify-center p-3 pb-8')}>

            <Text style={[tailwind('text-center text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>{strings.modals.out_of_space_modal.title}</Text>

            <View style={tailwind('items-center my-6')}>

              <View style={tailwind('items-center')}>
                <RunOutImage width={80} height={80} />
              </View>

              <Text style={[tailwind('text-sm text-neutral-100 mt-3'), globalStyle.fontWeight.medium]}>{strings.screens.storage.space.used.used} {prettysize(usageValues.usage)} {strings.screens.storage.space.used.of} {parseLimit()}</Text>

            </View>

            <View style={tailwind('flex-grow my-6')}>
              <Text style={tailwind('text-sm text-center text-neutral-100')}>Get a higher plan or remove files you will no longer</Text>
              <Text style={tailwind('text-sm text-center text-neutral-100')}>use in order to upload or sync your files again.</Text>
            </View>

            <TouchableHighlight
              underlayColor={getColor('blue-70')}
              style={tailwind('bg-blue-60 rounded-lg py-2 mx-6 items-center justify-center')}
              onPress={() => {
                props.dispatch(layoutActions.closeRanOutStorageModal());
                props.navigation.push('Billing')
              }}
            >
              <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>{strings.generic.upgradeNow}</Text>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(RunOutOfStorageModal)