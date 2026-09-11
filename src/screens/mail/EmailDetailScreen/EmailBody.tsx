import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import {
  buildEmailBodyHtml,
  hasRemoteImages,
  type EmailBodySource,
} from '../../../services/mail/emailBody/emailBodyContent';
import { buildEmailDocument } from '../../../services/mail/emailBody/emailDocument';
import { useEmailBodyHeight } from '../hooks/useEmailBodyHeight';

const OPENABLE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const GENERIC_USER_AGENT = 'Mozilla/5.0 (Mobile)';

export const EmailBody = ({ message, bodySource }: { message: EmailResponse; bodySource: EmailBodySource }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [areRemoteImagesAllowed, setAreRemoteImagesAllowed] = useState(false);
  const isFirstLoad = useRef(true);
  const backgroundColor = getColor('bg-surface');
  const textColor = getColor('text-gray-100');

  const body = useMemo(() => {
    const html = buildEmailBodyHtml(message, bodySource);
    return { html, hasImagesHostedElsewhere: hasRemoteImages(html) };
  }, [message, bodySource]);

  const emailDocument = useMemo(
    () => buildEmailDocument(body.html, { backgroundColor, textColor, areRemoteImagesAllowed }),
    [body.html, backgroundColor, textColor, areRemoteImagesAllowed],
  );

  const { height, heightReporterScript, onHeightReported, onMeasureFailed } = useEmailBodyHeight(emailDocument);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [emailDocument]);

  const onMessageFromBody = (event: WebViewMessageEvent) => {
    onHeightReported(event.nativeEvent.data);
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

  const areImagesBlocked = !areRemoteImagesAllowed && body.hasImagesHostedElsewhere;

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
    </View>
  );
};
