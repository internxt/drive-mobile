import { useEffect } from 'react';
import { Text, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { referralsThunks } from '../../store/slices/referrals';

const ReferralsWidget = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { list: referrals } = useAppSelector((state) => state.referrals);
  const renderReferrals = () =>
    referrals.map((r, i) => {
      const isTheLast = i === referrals.length - 1;

      return (
        <View key={r.key} style={[tailwind('p-4'), !isTheLast && tailwind('border-b border-neutral-20')]}>
          <Text>{r.key}</Text>
        </View>
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
