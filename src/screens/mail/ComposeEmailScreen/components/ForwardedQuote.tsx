import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

import strings from '../../../../../assets/lang/strings';
import AppText from '../../../../components/AppText';
import useGetColor from '../../../../hooks/useColor';
import { buildEmailDocument } from '../../../../services/mail/emailBody/emailDocument';
import { ForwardedQuote as ForwardedQuoteContent } from '../../../../types/mail';
import { useEmailBodyHeight } from '../../hooks/useEmailBodyHeight';

export const ForwardedQuote = ({ quote, originalSender }: { quote: ForwardedQuoteContent; originalSender: string }) => {
  const getColor = useGetColor();
  const [isOpen, setIsOpen] = useState(false);

  const backgroundColor = getColor('bg-gray-5');
  const emailDocument = buildEmailDocument(quote.body, {
    backgroundColor,
    textColor: getColor('text-gray-80'),
    areRemoteImagesAllowed: false,
  });
  const { height, heightReporterScript, onHeightReported, onMeasureFailed } = useEmailBodyHeight(emailDocument);

  const { forwardedFrom, showForwarded, hideForwarded } = strings.screens.compose_email;
  const CaretIcon = isOpen ? CaretUpIcon : CaretDownIcon;

  return (
    <View className="mx-4 mb-2 rounded-lg overflow-hidden" style={{ backgroundColor }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={isOpen ? hideForwarded : showForwarded}
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center px-3 py-2"
      >
        <AppText numberOfLines={1} className="flex-1 text-sm" style={{ color: getColor('text-gray-60') }}>
          {strings.formatString(forwardedFrom, originalSender)}
        </AppText>
        <AppText className="mr-1 text-sm" style={{ color: getColor('text-primary') }}>
          {isOpen ? hideForwarded : showForwarded}
        </AppText>
        <CaretIcon size={16} color={getColor('text-primary')} />
      </TouchableOpacity>

      {isOpen && (
        <WebView
          originWhitelist={['*']}
          source={{ html: emailDocument }}
          style={{ height: height || 1, opacity: height ? 1 : 0, backgroundColor: 'transparent' }}
          scrollEnabled={false}
          javaScriptEnabled
          injectedJavaScript={heightReporterScript}
          onMessage={(event) => onHeightReported(event.nativeEvent.data)}
          onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
          onError={onMeasureFailed}
          onHttpError={onMeasureFailed}
        />
      )}
    </View>
  );
};
