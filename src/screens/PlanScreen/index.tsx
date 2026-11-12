import { DateTime } from 'luxon';

import { CaretRight, DownloadSimple } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import ReactNativeBlobUtil, { ReactNativeBlobUtilConfig } from 'react-native-blob-util';
import CancelSubscriptionModal from 'src/components/modals/CancelSubscriptionModal';
import { titlerize } from 'src/helpers/strings';
import fileSystemService from 'src/services/FileSystemService';

import paymentService from 'src/services/PaymentService';
import storageService from 'src/services/StorageService';
import { useAppSelector } from 'src/store/hooks';
import { paymentsSelectors } from 'src/store/slices/payments';
import strings from '../../../assets/lang/strings';

import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import SettingsGroup from '../../components/SettingsGroup';
import { openUrl } from '../../helpers/utils';
import useGetColor from '../../hooks/useColor';
import { PRICING_URL } from '../../services/drive/constants';
import { SettingsScreenProps } from '../../types/navigation';

function PlanScreen({ navigation }: SettingsScreenProps<'Plan'>): JSX.Element {
  const getColor = useGetColor();

  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState(false);
  const { limit } = useAppSelector((state) => state.storage);
  const { subscription, defaultPaymentMethod, invoices } = useAppSelector((state) => state.payments);

  const hasLifetime = useAppSelector(paymentsSelectors.hasLifetime);
  const hasSubscription = useAppSelector(paymentsSelectors.hasSubscription);
  const title = hasLifetime ? strings.screens.PlanScreen.lifetimeTitle : strings.screens.PlanScreen.subscriptionTitle;
  const isPaypalPaymentMethod = !!defaultPaymentMethod?.paypal;

  const onBackButtonPressed = () => {
    navigation.goBack();
  };
  const onChangePlanPressed = () => {
    openUrl(PRICING_URL);
  };

  const onCancelSubscriptionModalClosed = () => {
    setIsCancelSubscriptionModalOpen(false);
  };

  const onSubscriptionCancelled = () => {
    navigation.goBack();
  };
  const onCancelSubscriptionPressed = () => {
    setIsCancelSubscriptionModalOpen(true);
  };
  const downloadInvoice = (url: string) => {
    const date = new Date();
    const file_ext = '.pdf';
    const { config, fs } = ReactNativeBlobUtil;
    const RootDir = fs.dirs.DownloadDir;
    const options: ReactNativeBlobUtilConfig = {
      fileCache: true,
      appendExt: 'pdf',
      addAndroidDownloads: {
        path: RootDir + '/file_' + Math.floor(date.getTime() + date.getSeconds() / 2) + file_ext,
        description: 'Downloading invoice...',
        notification: true,
        useDownloadManager: true,
      },
    };
    config(options)
      .fetch('GET', url)
      .then((res) => {
        fileSystemService.showFileViewer(res.data);
      });
  };

  const newChargeDate =
    'nextPayment' in subscription &&
    DateTime.fromMillis(subscription.nextPayment * 1000).setLocale(strings.getLanguage());

  return (
    <AppScreen
      hasBottomTabs
      safeAreaTop
      safeAreaColor={getColor('bg-surface')}
      className="flex-1"
      style={{ backgroundColor: getColor('bg-gray-5') }}
    >
      <AppScreenTitle
        text={title}
        containerStyle={{ backgroundColor: getColor('bg-surface') }}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />
      <ScrollView>
        <View className="pt-8 pb-10 px-4 min-h-full" style={{ backgroundColor: getColor('bg-gray-5') }}>
          {/* PLAN */}
          <SettingsGroup
            items={[
              {
                key: 'plan',
                template: (
                  <View className="px-4">
                    <View className="py-6 border-b" style={{ borderBottomColor: getColor('border-gray-10') }}>
                      <AppText className="text-4xl text-center" style={{ color: getColor('text-primary') }}>
                        {storageService.toString(limit)}
                      </AppText>
                      {subscription.type === 'subscription' ? (
                        <AppText className="text-center" style={{ color: getColor('text-gray-100') }}>{`${
                          subscription.amount * 0.01
                        } €/${
                          subscription.interval === 'month' ? strings.generic.month : strings.generic.year
                        }`}</AppText>
                      ) : (
                        <AppText className="text-center" style={{ color: getColor('text-gray-100') }}>
                          {strings.screens.PlanScreen.lifetimeTitle}
                        </AppText>
                      )}
                      {subscription.type === 'subscription' && newChargeDate && (
                        <AppText className="mt-4 text-center text-sm" style={{ color: getColor('text-gray-40') }}>
                          {strings.formatString(
                            strings.screens.PlanScreen.newChargeOn,
                            newChargeDate.toLocaleString(DateTime.DATE_FULL),
                          )}
                        </AppText>
                      )}
                    </View>
                    {hasSubscription && (
                      <TouchableOpacity onPress={onChangePlanPressed} className="py-3">
                        <AppText className="text-center text-lg" style={{ color: getColor('text-primary') }}>
                          {strings.buttons.changePlan}
                        </AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                ),
              },
            ]}
          />

          {/* PAYMENT METHOD */}
          {isPaypalPaymentMethod && (
            <SettingsGroup
              title={strings.screens.PlanScreen.paymentMethod.title}
              items={[
                {
                  key: 'payment-method',
                  template: (
                    <View className="flex-row items-center px-4 py-3">
                      <Image source={require('assets/images/paypal.png')} className="w-20 h-8 rounded-md mr-2.5" />
                    </View>
                  ),
                },
              ]}
            />
          )}

          {defaultPaymentMethod && !isPaypalPaymentMethod && defaultPaymentMethod.card && (
            <SettingsGroup
              title={strings.screens.PlanScreen.paymentMethod.title}
              items={[
                {
                  key: 'payment-method',
                  template: (
                    <View className="flex-row items-center px-4 py-3">
                      <Image
                        source={paymentService.getCardImage(defaultPaymentMethod.card?.brand)}
                        className="w-12 h-8 rounded-md mr-2.5"
                      />
                      <View>
                        <View className="flex-row items-center">
                          <AppText className="text-2xl" style={{ color: getColor('text-gray-100') }} bold>
                            {'···· ···· ···· '}
                          </AppText>
                          <AppText style={{ color: getColor('text-gray-100') }}>
                            {defaultPaymentMethod.card?.last4}
                          </AppText>
                        </View>

                        {defaultPaymentMethod.card && (
                          <AppText
                            className="text-sm"
                            style={{ color: getColor('text-gray-40') }}
                          >{`${defaultPaymentMethod.card?.exp_month
                            .toString()
                            .padStart(2, '0')}/${defaultPaymentMethod.card?.exp_year
                            .toString()
                            .padStart(2, '0')}`}</AppText>
                        )}
                      </View>
                    </View>
                  ),
                },
              ]}
            />
          )}

          {/* INVOICES */}
          <SettingsGroup
            title={strings.screens.PlanScreen.invoices.title}
            items={[
              {
                key: 'invoices',
                template: (
                  <View>
                    {invoices && invoices.length === 0 ? (
                      <AppText className="px-4 py-6 text-center text-sm" style={{ color: getColor('text-gray-40') }}>
                        {strings.screens.PlanScreen.invoices.empty}
                      </AppText>
                    ) : (
                      <>
                        <View
                          className="mx-4 py-3 flex-row border-b"
                          style={{ borderBottomColor: getColor('border-gray-10') }}
                        >
                          <AppText
                            className="text-xs"
                            style={[{ flex: 2 }, { color: getColor('text-gray-80') }]}
                            semibold
                          >
                            {strings.screens.PlanScreen.invoices.billingDate.toUpperCase()}
                          </AppText>
                          <AppText
                            className="text-xs"
                            style={[{ flex: 1 }, { color: getColor('text-gray-80') }]}
                            semibold
                          >
                            {strings.screens.PlanScreen.invoices.plan.toUpperCase()}
                          </AppText>
                        </View>
                        {invoices &&
                          invoices.map((invoice, index) => {
                            const isTheLast = index === invoices.length - 1;
                            const onDownloadPdfPressed = () => {
                              downloadInvoice(invoice.pdf);
                            };
                            const time = DateTime.fromMillis(invoice.created * 1000).setLocale(strings.getLanguage());
                            return (
                              <View key={invoice.id} className="px-4">
                                <View className="flex-row items-center">
                                  <AppText style={[{ flex: 2 }, { color: getColor('text-gray-100') }]}>
                                    {titlerize(time.toFormat('EEEE dd, MMM yyyy'))}
                                  </AppText>
                                  <View className="flex-row items-center" style={{ flex: 1 }}>
                                    <AppText className="flex-grow" style={{ color: getColor('text-gray-40') }}>
                                      {storageService.toString(invoice.bytesInPlan)}
                                    </AppText>
                                    <TouchableOpacity onPress={onDownloadPdfPressed}>
                                      <View className="-mr-4 px-4 py-4">
                                        <DownloadSimple size={20} color={getColor('text-primary')} />
                                      </View>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {!isTheLast && (
                                  <View style={[{ height: 1 }, { backgroundColor: getColor('bg-gray-10') }]} />
                                )}
                              </View>
                            );
                          })}
                      </>
                    )}
                  </View>
                ),
              },
            ]}
          />

          {/* CANCEL SUBSCRIPTION */}
          {hasSubscription && (
            <SettingsGroup
              items={[
                {
                  key: 'debug',
                  template: (
                    <View className="flex-row items-center px-4 py-3">
                      <View className="flex-grow justify-center">
                        <AppText className="text-lg" style={{ color: getColor('text-gray-100') }}>
                          {strings.buttons.cancelSubscription}
                        </AppText>
                      </View>
                      <View className="justify-center">
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onCancelSubscriptionPressed,
                },
              ]}
            />
          )}
        </View>
      </ScrollView>
      <CancelSubscriptionModal
        isOpen={isCancelSubscriptionModalOpen}
        onClose={onCancelSubscriptionModalClosed}
        onSubscriptionCancelled={onSubscriptionCancelled}
      />
    </AppScreen>
  );
}

export default PlanScreen;
