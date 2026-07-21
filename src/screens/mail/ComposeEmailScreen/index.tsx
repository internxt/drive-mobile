import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppButton from '../../../components/AppButton';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppTextInput from '../../../components/AppTextInput';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { RootStackScreenProps } from '../../../types/navigation';

export function ComposeEmailScreen({ navigation }: RootStackScreenProps<'ComposeEmail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const onCancel = () => navigation.goBack();

  const onSend = () => {
    // TODO: wire up to the mail bridge send endpoint once available
    navigation.goBack();
  };

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle text={strings.screens.compose_email.title} onBackButtonPressed={onCancel} />

      <ScrollView style={tailwind('px-4')} keyboardShouldPersistTaps="handled">
        <AppTextInput
          containerStyle={tailwind('mb-4')}
          label={strings.inputs.to}
          value={to}
          onChangeText={setTo}
          placeholder={strings.placeholders.emailRecipient}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <AppTextInput
          containerStyle={tailwind('mb-4')}
          label={strings.inputs.subject}
          value={subject}
          onChangeText={setSubject}
          placeholder={strings.placeholders.emailSubject}
        />

        <AppTextInput
          containerStyle={tailwind('mb-4')}
          wrapperStyle={{ minHeight: 160, alignItems: 'flex-start' }}
          label={strings.inputs.body}
          value={body}
          onChangeText={setBody}
          placeholder={strings.placeholders.emailBody}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 160, color: getColor('text-gray-100') }}
        />
      </ScrollView>
      <View style={[tailwind('px-4 pt-3'), { borderTopWidth: 1, borderTopColor: getColor('border-gray-5') }]}>
        <AppButton title={strings.buttons.send} type="accept" onPress={onSend} disabled={!to || !subject} />
      </View>
    </AppScreen>
  );
}
