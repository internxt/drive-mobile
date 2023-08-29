import Portal from '@burstware/react-native-portal';
import strings from 'assets/lang/strings';
import React, { useEffect, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import { titlerize } from 'src/helpers/strings';
import fileSystemService, { UsageStatsResult } from 'src/services/FileSystemService';
import { useTailwind } from 'tailwind-rn/dist';
import AppButton from '../AppButton';
import AppText from '../AppText';
import BottomModal from '../modals/BottomModal';

export const DebugDeviceStorageWidget = ({ style }: { style: ViewStyle }) => {
  const tailwind = useTailwind();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [usageData, setUsageData] = useState<UsageStatsResult | null>(null);
  useEffect(() => {
    if (sheetOpen) {
      setUsageData(null);
      fileSystemService.getUsageStats().then((dirs) => {
        setUsageData(dirs);
      });
    }
  }, [sheetOpen]);

  const renderUsageData = (usage: UsageStatsResult) => {
    return (
      <View>
        {Object.keys(usage).map((key) => {
          const value = usage[key];
          const isTotal = key === 'total';
          return (
            <View
              key={key}
              style={tailwind(
                `flex flex-row justify-between border-b border-gray-10 py-2 ${isTotal ? 'mt-8 border-0' : ''}`,
              )}
            >
              <AppText semibold={isTotal} style={tailwind('w-1/3')}>
                {titlerize(key)}
              </AppText>
              <AppText style={tailwind('w-1/3')}>{value.items.length}</AppText>
              <AppText style={tailwind('w-1/3')}>{value.prettySize}</AppText>
            </View>
          );
        })}
      </View>
    );
  };
  return (
    <View style={[tailwind('px-5'), style]}>
      <AppText style={tailwind('text-xl')}>Device Storage</AppText>
      <AppText style={tailwind('text-gray-50 text-base')}>Visualiza el uso del espacio en el dispositivo</AppText>

      <View style={tailwind('h-3')}></View>
      <AppButton title={strings.buttons.showStorageSpace} onPress={() => setSheetOpen(true)} type="accept" />

      <Portal>
        <BottomModal isOpen={sheetOpen} onClosed={() => setSheetOpen(false)} style={tailwind('py-8 px-5')}>
          <View style={tailwind('flex flex-row justify-between')}>
            <AppText semibold style={tailwind('w-1/3 text-lg')}>
              Directory
            </AppText>
            <AppText semibold style={tailwind('w-1/3 text-lg')}>
              Items
            </AppText>
            <AppText semibold style={tailwind('w-1/3 text-lg')}>
              Size
            </AppText>
          </View>
          <View>{usageData ? renderUsageData(usageData) : null}</View>
        </BottomModal>
      </Portal>
    </View>
  );
};
