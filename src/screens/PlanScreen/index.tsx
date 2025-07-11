import moment from 'moment';

import { CaretRight, DownloadSimple } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import RNFetchBlob, { RNFetchBlobConfig } from 'rn-fetch-blob';
import CancelSubscriptionModal from 'src/components/modals/CancelSubscriptionModal';
import { titlerize } from 'src/helpers/strings';
import fileSystemService from 'src/services/FileSystemService';

import paymentService from 'src/services/PaymentService';
import storageService from 'src/services/StorageService';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { paymentsSelectors } from 'src/store/slices/payments';
import { uiActions } from 'src/store/slices/ui';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';

import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import SettingsGroup from '../../components/SettingsGroup';
import useGetColor from '../../hooks/useColor';
import { SettingsScreenProps } from '../../types/navigation';

function PlanScreen({ navigation }: SettingsScreenProps<'Plan'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
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
    dispatch(uiActions.setIsPlansModalOpen(true));
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
    const { config, fs } = RNFetchBlob;
    const RootDir = fs.dirs.DownloadDir;
    const options: RNFetchBlobConfig = {
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
    'nextPayment' in subscription && moment(subscription.nextPayment * 1000).locale(strings.getLanguage());

  return (
    <AppScreen
      hasBottomTabs
      safeAreaTop
      safeAreaColor={getColor('bg-surface')}
      style={[tailwind('flex-1'), { backgroundColor: getColor('bg-gray-5') }]}
    >
      <AppScreenTitle
        text={title}
        containerStyle={{ backgroundColor: getColor('bg-surface') }}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />
      <ScrollView contentContainerStyle={tailwind('h-full')}>
        <View style={[tailwind('pt-8 pb-10 px-4 min-h-full'), { backgroundColor: getColor('bg-gray-5') }]}>
          {/* PLAN */}
          <SettingsGroup
            items={[
              {
                key: 'plan',
                template: (
                  <View style={tailwind('px-4')}>
                    <View style={[tailwind('py-6 border-b'), { borderBottomColor: getColor('border-gray-10') }]}>
                      <AppText style={[tailwind('text-4xl text-center'), { color: getColor('text-primary') }]}>
                        {storageService.toString(limit)}
                      </AppText>
                      {subscription.type === 'subscription' ? (
                        <AppText style={[tailwind('text-center'), { color: getColor('text-gray-100') }]}>{`${
                          subscription.amount * 0.01
                        } €/${
                          subscription.interval === 'month' ? strings.generic.month : strings.generic.year
                        }`}</AppText>
                      ) : (
                        <AppText style={[tailwind('text-center'), { color: getColor('text-gray-100') }]}>
                          {strings.screens.PlanScreen.lifetimeTitle}
                        </AppText>
                      )}
                      {subscription.type === 'subscription' && newChargeDate && (
                        <AppText style={[tailwind('mt-4 text-center text-sm'), { color: getColor('text-gray-40') }]}>
                          {strings.formatString(strings.screens.PlanScreen.newChargeOn, newChargeDate.format('LL'))}
                        </AppText>
                      )}
                    </View>
                    {hasSubscription && (
                      <TouchableOpacity onPress={onChangePlanPressed} style={tailwind('py-3')}>
                        <AppText style={[tailwind('text-center text-lg'), { color: getColor('text-primary') }]}>
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
                    <View style={tailwind('flex-row items-center px-4 py-3')}>
                      <Image
                        source={require('assets/images/paypal.png')}
                        style={tailwind('w-20 h-8 rounded-md mr-2.5')}
                      />
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
                    <View style={tailwind('flex-row items-center px-4 py-3')}>
                      <Image
                        source={paymentService.getCardImage(defaultPaymentMethod.card?.brand)}
                        style={tailwind('w-12 h-8 rounded-md mr-2.5')}
                      />
                      <View>
                        <View style={tailwind('flex-row items-center')}>
                          <AppText style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]} bold>
                            {'···· ···· ···· '}
                          </AppText>
                          <AppText style={{ color: getColor('text-gray-100') }}>
                            {defaultPaymentMethod.card?.last4}
                          </AppText>
                        </View>

                        {defaultPaymentMethod.card && (
                          <AppText
                            style={[tailwind('text-sm'), { color: getColor('text-gray-40') }]}
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
                      <AppText style={[tailwind('px-4 py-6 text-center text-sm'), { color: getColor('text-gray-40') }]}>
                        {strings.screens.PlanScreen.invoices.empty}
                      </AppText>
                    ) : (
                      <>
                        <View
                          style={[
                            tailwind('mx-4 py-3 flex-row border-b'),
                            { borderBottomColor: getColor('border-gray-10') },
                          ]}
                        >
                          <AppText
                            style={[{ ...tailwind('text-xs'), flex: 2 }, { color: getColor('text-gray-80') }]}
                            semibold
                          >
                            {strings.screens.PlanScreen.invoices.billingDate.toUpperCase()}
                          </AppText>
                          <AppText
                            style={[{ ...tailwind('text-xs'), flex: 1 }, { color: getColor('text-gray-80') }]}
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
                            const time = moment(invoice.created * 1000).locale(strings.getLanguage());
                            return (
                              <View key={invoice.id} style={tailwind('px-4')}>
                                <View style={tailwind('flex-row items-center')}>
                                  <AppText style={[{ flex: 2 }, { color: getColor('text-gray-100') }]}>
                                    {titlerize(time.format('dddd DD, MMM yyyy'))}
                                  </AppText>
                                  <View style={{ flex: 1, ...tailwind('flex-row items-center') }}>
                                    <AppText style={[tailwind('flex-grow'), { color: getColor('text-gray-40') }]}>
                                      {storageService.toString(invoice.bytesInPlan)}
                                    </AppText>
                                    <TouchableOpacity onPress={onDownloadPdfPressed}>
                                      <View style={tailwind('-mr-4 px-4 py-4')}>
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
                    <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                      <View style={tailwind('flex-grow justify-center')}>
                        <AppText style={[tailwind('text-lg'), { color: getColor('text-gray-100') }]}>
                          {strings.buttons.cancelSubscription}
                        </AppText>
                      </View>
                      <View style={tailwind('justify-center')}>
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
