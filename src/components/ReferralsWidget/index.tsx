import prettysize from 'prettysize';
import { useEffect } from 'react';
import { Text, TouchableHighlight, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { referralsThunks } from '../../store/slices/referrals';
import { ReferralTypes } from '@internxt/sdk/dist/drive';
import { uiActions } from '../../store/slices/ui';
import globalStyle from '../../styles/global';
import { CaretRight, Check } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

const ReferralsWidget = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { list: referrals } = useAppSelector((state) => state.referrals);
  const renderReferrals = () =>
    referrals.map((r, i) => {
      const fn: { [key in ReferralTypes.ReferralKey]?: () => void } = {
        [ReferralTypes.ReferralKey.SubscribeToNewsletter]: () => {
          dispatch(uiActions.setIsNewsletterModalOpen(true));
        },
        [ReferralTypes.ReferralKey.InviteFriends]: () => {
          dispatch(uiActions.setIsInviteFriendsModalOpen(true));
        },
      };
      const hasClickAction = !!fn[r.key];
      const isTheLast = i === referrals.length - 1;
      const creditText = prettysize(r.credit, true);
      const text = strings.formatString(strings.screens.storage.referrals.items[r.key], r.completedSteps, r.steps);
      const onPress = () => fn[r.key]?.();
      return (
        <TouchableHighlight
          disabled={r.isCompleted || !hasClickAction}
          underlayColor={getColor('text-neutral-30')}
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
              <Text
                style={[
                  r.isCompleted ? tailwind('text-green-50') : tailwind('text-neutral-100'),
                  globalStyle.fontWeight.semibold,
                ]}
              >
                {creditText}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[tailwind('text-base flex-1'), r.isCompleted && tailwind('text-neutral-60')]}
            >
              {text}
            </Text>

            {r.isCompleted ? (
              <Check color={getColor('text-green-50')} size={24} style={tailwind('ml-2')} />
            ) : (
              hasClickAction && <CaretRight color={getColor('text-blue-60')} size={24} style={tailwind('ml-2')} />
            )}
          </View>
        </TouchableHighlight>
      );
    });

  useEffect(() => {
    dispatch(referralsThunks.fetchReferralsThunk());
  }, []);

  return referrals.length > 0 ? (
    <View style={tailwind('mx-5 mt-7')}>
      <Text style={[tailwind('text-xs text-neutral-80 mb-2'), { ...globalStyle.fontWeight.semibold }]}>
        {strings.screens.storage.referrals.title.toUpperCase()}
      </Text>
      <View style={tailwind('bg-white rounded-xl')}>{renderReferrals()}</View>
    </View>
  ) : (
    <View></View>
  );
};

export default ReferralsWidget;
