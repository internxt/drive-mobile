import prettysize from 'prettysize';
import { useEffect } from 'react';
import { Text, TouchableHighlight, View } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { referralsThunks } from '../../store/slices/referrals';
import { ReferralTypes } from '@internxt/sdk/dist/drive';
import { layoutActions } from '../../store/slices/layout';

const ReferralsWidget = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { list: referrals } = useAppSelector((state) => state.referrals);
  const renderReferrals = () =>
    referrals.map((r, i) => {
      const fn: { [key in ReferralTypes.ReferralKey]?: () => void } = {
        [ReferralTypes.ReferralKey.SubscribeToNewsletter]: () => {
          dispatch(layoutActions.setIsNewsletterModalOpen(true));
        },
        [ReferralTypes.ReferralKey.InviteFriends]: () => {
          dispatch(layoutActions.setIsInviteFriendsModalOpen(true));
        },
      };
      const hasClickAction = !!fn[r.key];
      const isTheLast = i === referrals.length - 1;
      const creditText = prettysize(r.credit);
      const text = strings.formatString(strings.screens.storage.referrals.items[r.key], r.completedSteps, r.steps);
      const onPress = () => fn[r.key]?.();
      return (
        <TouchableHighlight
          disabled={r.isCompleted || !hasClickAction}
          underlayColor={getColor('neutral-30')}
          key={r.key}
          onPress={onPress}
        >
          <View style={[tailwind('flex-row items-center p-4'), !isTheLast && tailwind('border-b border-neutral-20')]}>
            <View
              style={[
                tailwind('py-1 px-2 mr-2 rounded-md'),
                r.isCompleted ? tailwind('bg-green-10') : tailwind('bg-neutral-20'),
              ]}
            >
              <Text style={[r.isCompleted ? tailwind('text-green-50') : tailwind('text-neutral-100')]}>
                {creditText}
              </Text>
            </View>

            <Text numberOfLines={1} style={[tailwind('flex-1'), r.isCompleted && tailwind('text-neutral-60')]}>
              {text}
            </Text>

            {r.isCompleted ? (
              <Unicons.UilCheck color={getColor('green-50')} size={24} style={tailwind('ml-2')} />
            ) : (
              hasClickAction && <Unicons.UilAngleRight color={getColor('blue-60')} size={24} style={tailwind('ml-2')} />
            )}
          </View>
        </TouchableHighlight>
      );
    });

  useEffect(() => {
    dispatch(referralsThunks.fetchReferralsThunk());
  }, []);

  return (
    <View style={tailwind('mx-5 mt-7')}>
      <Text style={tailwind('text-neutral-80 mb-2')}>{strings.screens.storage.referrals.title.toUpperCase()}</Text>
      <View style={tailwind('bg-white rounded-lg')}>{renderReferrals()}</View>
    </View>
  );
};

export default ReferralsWidget;
