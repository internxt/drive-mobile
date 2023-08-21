import prettysize from 'prettysize';
import { useEffect, useMemo } from 'react';
import { Linking, TouchableHighlight, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { referralsActions, referralsThunks } from '../../store/slices/referrals';
import { ReferralTypes } from '@internxt/sdk/dist/drive';
import { uiActions } from '../../store/slices/ui';
import { CaretRight, CheckCircle } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import SettingsGroup from '../SettingsGroup';
import storageService from 'src/services/StorageService';
import UsersReferralsService from '@internxt-mobile/services/UsersReferralsService';
import { realtime } from '@internxt-mobile/services/NetworkService/realtimeUpdates';
import AuthService from '@internxt-mobile/services/AuthService';
import errorService from '@internxt-mobile/services/ErrorService';

const ReferralsWidget = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { list: referrals } = useAppSelector((state) => state.referrals);
  const totalReferralsStorage = useMemo(() => referrals.reduce((t, x) => t + x.credit * x.steps, 0), [referrals]);
  const unlockedReferralsStorage = useMemo(
    () => referrals.reduce((t, x) => (x.isCompleted ? t + x.credit * x.completedSteps : t), 0),
    [referrals],
  );
  const renderReferrals = () =>
    referrals.map((r, i) => {
      const fn: { [key in ReferralTypes.ReferralKey]?: () => void } = {
        [ReferralTypes.ReferralKey.SubscribeToNewsletter]: () => {
          dispatch(uiActions.setIsNewsletterModalOpen(true));
        },
        [ReferralTypes.ReferralKey.CompleteSurvey]: async () => {
          const { credentials } = await AuthService.getAuthCredentials();
          if (!credentials?.user) return;
          Linking.openURL(UsersReferralsService.getSurveyLink(credentials.user.uuid, realtime.getSocketId()));
        },
        [ReferralTypes.ReferralKey.InviteFriends]: () => {
          dispatch(uiActions.setIsInviteFriendsModalOpen(true));
        },
      };
      const hasClickAction = !!fn[r.key];
      const isTheLast = i === referrals.length - 1;
      const creditText = prettysize(r.credit, true);
      const text = strings.formatString(
        strings.screens.StorageScreen.referrals.items[r.key],
        r.completedSteps,
        r.steps,
      );

      const onPress = () => fn[r.key]?.();
      return (
        <TouchableHighlight
          disabled={r.isCompleted || !hasClickAction}
          underlayColor={getColor('text-gray-5')}
          key={r.key}
          onPress={onPress}
        >
          <View style={[tailwind('flex-row items-center px-4 py-3'), !isTheLast && tailwind('border-b border-gray-5')]}>
            <AppText numberOfLines={1} style={[tailwind('text-lg flex-1'), r.isCompleted && tailwind('text-gray-40')]}>
              {text}
            </AppText>

            <AppText style={r.isCompleted ? tailwind('text-green') : tailwind('text-gray-40')}>{creditText}</AppText>
            {r.isCompleted ? (
              <CheckCircle weight="fill" color={getColor('text-green')} size={20} style={tailwind('ml-2.5')} />
            ) : (
              hasClickAction && <CaretRight color={getColor('text-gray-40')} size={20} style={tailwind('ml-2.5')} />
            )}
          </View>
        </TouchableHighlight>
      );
    });

  useEffect(() => {
    dispatch(referralsThunks.fetchReferralsThunk());
  }, []);

  return referrals.length > 0 ? (
    <SettingsGroup
      title={strings.screens.StorageScreen.referrals.title.toUpperCase()}
      items={[
        {
          key: 'referrals',
          template: (
            <View>
              <View style={tailwind('my-8 px-4')}>
                <AppText style={tailwind('text-center text-lg')}>
                  {strings.screens.StorageScreen.referrals.youHaveUnlocked}
                </AppText>
                <AppText style={tailwind('text-center text-3xl text-green')} medium>
                  {storageService.toString(unlockedReferralsStorage)}
                </AppText>
                <AppText style={tailwind('text-center text-lg')}>
                  {strings.formatString(strings.generic.ofN, storageService.toString(totalReferralsStorage))}
                </AppText>
              </View>
              {renderReferrals()}
            </View>
          ),
        },
      ]}
    />
  ) : (
    <></>
  );
};

export default ReferralsWidget;
