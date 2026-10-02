import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { type EmailBodySource } from '../../../services/mail/emailBody/emailBodyContent';
import { buildEmailDocument } from '../../../services/mail/emailBody/emailDocument';
import { buildEmailBodyParts } from '../../../services/mail/emailBody/quotedText';
import { useBlockedRemoteImages } from '../hooks/useBlockedRemoteImages';
import { useEmailBodyHeight } from '../hooks/useEmailBodyHeight';

const OPENABLE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const GENERIC_USER_AGENT = 'Mozilla/5.0 (Mobile)';
const QUOTE_TOGGLE_HEIGHT = 22;
const QUOTE_TOGGLE_MIN_WIDTH = 34;
const QUOTE_TOGGLE_HORIZONTAL_PADDING = 8;
const QUOTE_TOGGLE_LETTER_SPACING = 1;
const QUOTE_TOGGLE_DOTS = '•••';

export const EmailBody = ({ message, bodySource }: { message: EmailResponse; bodySource: EmailBodySource }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [areRemoteImagesAllowed, setAreRemoteImagesAllowed] = useState(false);
  const [isQuoteShown, setIsQuoteShown] = useState(false);
  const isFirstLoad = useRef(true);
  const backgroundColor = getColor('bg-surface');
  const textColor = getColor('text-gray-100');

  const { fullHtml, htmlWithoutQuote } = useMemo(() => buildEmailBodyParts(message, bodySource), [message, bodySource]);
  const hasQuote = htmlWithoutQuote !== null;
  const bodyHtml = hasQuote && !isQuoteShown ? htmlWithoutQuote : fullHtml;

  const emailDocument = useMemo(
    () => buildEmailDocument(bodyHtml, { backgroundColor, textColor, areRemoteImagesAllowed }),
    [bodyHtml, backgroundColor, textColor, areRemoteImagesAllowed],
  );

  const { height, heightReporterScript, onHeightReported, onMeasureFailed } = useEmailBodyHeight(emailDocument);
  const { hasBlockedRemoteImages, isBlockedRemoteImageReport, onBlockedRemoteImageReported } =
    useBlockedRemoteImages(emailDocument);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [emailDocument]);

  const onMessageFromBody = (event: WebViewMessageEvent) => {
    const reportedMessage = event.nativeEvent.data;
    if (isBlockedRemoteImageReport(reportedMessage)) {
      onBlockedRemoteImageReported();
      return;
    }
    onHeightReported(reportedMessage);
  };

  const onNavigationRequested = (request: ShouldStartLoadRequest) => {
    if (isFirstLoad.current || request.url === 'about:blank') {
      isFirstLoad.current = false;
      return true;
    }

    const scheme = request.url.slice(0, request.url.indexOf(':') + 1).toLowerCase();
    if (OPENABLE_SCHEMES.has(scheme)) {
      Linking.openURL(request.url).catch((error) => logger.error('Could not open a link from an email:', error));
    }
    return false;
  };

  const areImagesBlocked = !areRemoteImagesAllowed && hasBlockedRemoteImages;

  if (bodySource.type === 'encryptedUnreadable') {
    return (
      <View
        style={[tailwind('flex-row items-center rounded-lg px-3 py-3'), { backgroundColor: getColor('bg-gray-5') }]}
      >
        <AppText style={[tailwind('flex-1 text-sm'), { color: getColor('text-gray-60') }]}>
          {strings.screens.mail.unableToDecryptPreview}
        </AppText>
      </View>
    );
  }

  return (
    <View>
      {areImagesBlocked && (
        <View
          style={[
            tailwind('mb-3 flex-row items-center justify-between rounded-lg px-3 py-2'),
            { backgroundColor: getColor('bg-gray-5') },
          ]}
        >
          <AppText numberOfLines={2} style={[tailwind('flex-1 pr-3 text-xs'), { color: getColor('text-gray-60') }]}>
            {strings.screens.mail.remoteImagesBlocked}
          </AppText>
          <TouchableOpacity accessibilityRole="button" onPress={() => setAreRemoteImagesAllowed(true)}>
            <AppText style={[tailwind('text-sm'), { color: getColor('text-primary') }]}>
              {strings.screens.mail.showRemoteImages}
            </AppText>
          </TouchableOpacity>
        </View>
      )}
      <WebView
        originWhitelist={['*']}
        source={{ html: emailDocument }}
        style={{ height: height || 1, opacity: height ? 1 : 0, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        javaScriptEnabled
        injectedJavaScript={heightReporterScript}
        onMessage={onMessageFromBody}
        onShouldStartLoadWithRequest={onNavigationRequested}
        onError={onMeasureFailed}
        onHttpError={onMeasureFailed}
        onRenderProcessGone={onMeasureFailed}
        onContentProcessDidTerminate={onMeasureFailed}
        userAgent={GENERIC_USER_AGENT}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        incognito
        cacheEnabled={false}
        domStorageEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        allowsLinkPreview={false}
        showsVerticalScrollIndicator={false}
      />
      {hasQuote && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isQuoteShown ? strings.screens.email_detail.hideQuotedText : strings.screens.email_detail.showQuotedText
          }
          onPress={() => setIsQuoteShown(!isQuoteShown)}
          style={({ pressed }) => [
            tailwind('items-center justify-center rounded-full mt-3'),
            {
              alignSelf: 'flex-start',
              height: QUOTE_TOGGLE_HEIGHT,
              minWidth: QUOTE_TOGGLE_MIN_WIDTH,
              paddingHorizontal: QUOTE_TOGGLE_HORIZONTAL_PADDING,
              backgroundColor: getColor(pressed ? 'bg-gray-10' : 'bg-gray-5'),
            },
          ]}
        >
          <AppText
            semibold
            style={[
              tailwind('text-xs'),
              {
                color: getColor('text-gray-60'),
                letterSpacing: isQuoteShown ? 0 : QUOTE_TOGGLE_LETTER_SPACING,
              },
            ]}
          >
            {isQuoteShown ? strings.screens.email_detail.hideQuotedText : QUOTE_TOGGLE_DOTS}
          </AppText>
        </Pressable>
      )}
    </View>
  );
};
