import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { DateFilter, DatePreset } from '@internxt-mobile/services/mail/mailSearch';
import strings from '../../../../../assets/lang/strings';
import AppButton from '../../../../components/AppButton';
import AppText from '../../../../components/AppText';
import BottomModal from '../../../../components/modals/BottomModal';
import useGetColor from '../../../../hooks/useColor';
import { time } from '../../../../services/common/time/time.service';

const DATE_PRESETS: DatePreset[] = ['anyDate', 'today', 'last7Days', 'last30Days', 'thisYear', 'lastYear'];
const PICKED_DATE_FORMAT = 'd LLL yyyy';
const OPTION_PRESSED_OPACITY = 0.65;

type DateRange = { startDate: Date; endDate: Date };

const getInitialRange = (date: DateFilter): DateRange => {
  if (date.preset === 'customRange') {
    return { startDate: date.startDate, endDate: date.endDate };
  }
  const today = new Date();
  return { startDate: today, endDate: today };
};

const DateOption = ({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      activeOpacity={OPTION_PRESSED_OPACITY}
      onPress={onPress}
      style={[tailwind('rounded-lg px-4 py-2.5'), isSelected && { backgroundColor: getColor('bg-primary-10') }]}
    >
      <AppText
        semibold
        style={[tailwind('text-lg'), { color: getColor(isSelected ? 'text-primary' : 'text-gray-100') }]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

const DateField = ({
  label,
  value,
  minimumDate,
  maximumDate,
  onChange,
}: {
  label: string;
  value: Date;
  minimumDate?: Date;
  maximumDate: Date;
  onChange: (date: Date) => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const onPickerChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    if (event.type === 'set' && pickedDate) {
      onChange(pickedDate);
    }
  };

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({ value, mode: 'date', minimumDate, maximumDate, onChange: onPickerChange });

  return (
    <View style={tailwind('flex-row items-center justify-between px-4 py-2')}>
      <AppText style={[tailwind('text-base'), { color: getColor('text-gray-60') }]}>{label}</AppText>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onPickerChange}
        />
      ) : (
        <TouchableOpacity accessibilityRole="button" onPress={openAndroidPicker} style={tailwind('py-1.5')}>
          <AppText medium style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
            {time.getFormattedDate(value, PICKED_DATE_FORMAT)}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** Bottom sheet to pick the period of a search: a preset, or a range of days that cannot end before it starts. */
export const DateFilterModal = ({
  isOpen,
  date,
  onClose,
  onChange,
}: {
  isOpen: boolean;
  date: DateFilter;
  onClose: () => void;
  onChange: (date: DateFilter) => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [editedRange, setEditedRange] = useState<DateRange | null>(null);
  const { filters } = strings.screens.mail.search;

  const close = () => {
    setEditedRange(null);
    onClose();
  };

  const choose = (chosenDate: DateFilter) => {
    onChange(chosenDate);
    close();
  };

  const header = (
    <AppText semibold style={[tailwind('text-lg'), { color: getColor('text-gray-100') }]}>
      {filters.date}
    </AppText>
  );

  return (
    <BottomModal isOpen={isOpen} onClosed={close} header={header}>
      <View style={tailwind('px-4 pb-4')}>
        {DATE_PRESETS.map((preset) => (
          <DateOption
            key={preset}
            label={filters.datePresets[preset]}
            isSelected={!editedRange && date.preset === preset}
            onPress={() => choose({ preset })}
          />
        ))}
        <DateOption
          label={filters.datePresets.customRange}
          isSelected={!!editedRange || date.preset === 'customRange'}
          onPress={() => setEditedRange(getInitialRange(date))}
        />
        {editedRange ? (
          <View style={tailwind('mt-2')}>
            <DateField
              label={filters.startDate}
              value={editedRange.startDate}
              maximumDate={editedRange.endDate}
              onChange={(startDate) => setEditedRange({ ...editedRange, startDate })}
            />
            <DateField
              label={filters.endDate}
              value={editedRange.endDate}
              minimumDate={editedRange.startDate}
              maximumDate={new Date()}
              onChange={(endDate) => setEditedRange({ ...editedRange, endDate })}
            />
            <AppButton
              style={tailwind('mt-4')}
              type="accept"
              title={strings.buttons.apply}
              onPress={() => choose({ preset: 'customRange', ...editedRange })}
            />
          </View>
        ) : null}
      </View>
    </BottomModal>
  );
};
