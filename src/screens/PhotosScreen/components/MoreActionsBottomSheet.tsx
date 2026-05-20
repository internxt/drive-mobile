import {
  CaretLeftIcon,
  CloudArrowUpIcon,
  CopyIcon,
  DownloadSimpleIcon,
  ExportIcon,
  PlusSquareIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { TimelinePhotoItem } from '../types';
import { isItemBacked, isLocalItemNotBacked } from '../utils/photoUtils';

interface MoreActionsBottomSheetProps {
  isOpen: boolean;
  selectedItems: TimelinePhotoItem[];
  onClose: () => void;
  onExport: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onSave: () => void;
  onFavorite: () => void;
  onTrash: () => void;
  onRestore: () => void;
}

interface ActionRowProps {
  icon: React.ReactElement;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  isLast?: boolean;
}

const SEPARATOR_COLOR = '#f9f9fc';
const SLIDE_DISTANCE = 600;

const ActionRow = ({ icon, label, onPress, isDestructive, isLast }: ActionRowProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[tailwind('flex-row items-center px-4'), styles.row]}
      hitSlop={{ top: 2, bottom: 2 }}
    >
      <View style={[styles.rowInner, !isLast && { borderBottomColor: SEPARATOR_COLOR, borderBottomWidth: 1 }]}>
        <View style={styles.iconContainer}>{icon}</View>
        <AppText
          medium
          style={[
            tailwind('text-base flex-1'),
            { color: isDestructive ? getColor('text-red') : getColor('text-gray-100') },
          ]}
        >
          {label}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};

const MoreActionsBottomSheet = ({
  isOpen,
  selectedItems,
  onClose,
  onExport,
  onCopy,
  onDuplicate,
  onSave,
  onFavorite,
  onTrash,
  onRestore,
}: MoreActionsBottomSheetProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SLIDE_DISTANCE,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  const areAllSelectedItemsBacked = selectedItems.every(isItemBacked);
  const areAllSelectedNotBacked = selectedItems.every(isLocalItemNotBacked);
  const isOneItemSelected = selectedItems.length === 1;
  const hasBackedOrCloud = selectedItems.some(isItemBacked);
  const isSinglePhoto = isOneItemSelected && selectedItems[0]?.mediaType === 'photo';

  const iconColor = getColor('text-gray-80');
  const actionStrings = strings.screens.photos.selection.more;

  const visibleActions = useMemo(
    () =>
      [
        areAllSelectedItemsBacked && {
          key: 'export',
          label: actionStrings.export,
          icon: <ExportIcon size={22} color={iconColor} />,
          onPress: onExport,
        },
        areAllSelectedItemsBacked &&
          isSinglePhoto && {
            key: 'copy',
            label: actionStrings.copy,
            icon: <CopyIcon size={22} color={iconColor} />,
            onPress: onCopy,
          },
        areAllSelectedItemsBacked &&
          isOneItemSelected && {
            key: 'duplicate',
            label: actionStrings.duplicate,
            icon: <PlusSquareIcon size={22} color={iconColor} />,
            onPress: onDuplicate,
          },
        areAllSelectedNotBacked && {
          key: 'restore',
          label: actionStrings.uploadToCloud,
          icon: <CloudArrowUpIcon size={22} color={iconColor} />,
          onPress: onRestore,
        },
        hasBackedOrCloud && {
          key: 'save',
          label: actionStrings.save,
          icon: <DownloadSimpleIcon size={22} color={iconColor} />,
          onPress: onSave,
        },
        // TODO: re-enable favorites when implemented
        // areAllSelectedItemsBacked && {
        //   key: 'favorite',
        //   label: actionStrings.addToFavorites,
        //   icon: <StarIcon size={22} color={iconColor} />,
        //   onPress: onFavorite,
        // },
        areAllSelectedItemsBacked && {
          key: 'trash',
          label: actionStrings.moveToTrash,
          icon: <TrashIcon size={22} color={getColor('text-red')} />,
          onPress: onTrash,
          isDestructive: true,
        },
      ].filter(Boolean) as {
        key: string;
        label: string;
        icon: React.ReactElement;
        onPress: () => void;
        isDestructive?: boolean;
      }[],
    [
      areAllSelectedItemsBacked,
      areAllSelectedNotBacked,
      isOneItemSelected,
      isSinglePhoto,
      hasBackedOrCloud,
      iconColor,
      actionStrings,
      onExport,
      onCopy,
      onDuplicate,
      onSave,
      onFavorite,
      onTrash,
      onRestore,
    ],
  );

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={isOpen ? 'box-none' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: getColor('bg-surface'), paddingBottom: insets.bottom, transform: [{ translateY }] },
        ]}
      >
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[tailwind('flex-row items-center px-4'), styles.row]}
        >
          <View style={[tailwind('absolute'), { top: 0, left: 0, right: 0, alignItems: 'center' }]}>
            <View style={[tailwind('bg-gray-20'), { width: 48, height: 4, borderRadius: 2, marginTop: 8 }]} />
          </View>

          <View style={[styles.rowInner, { borderBottomColor: SEPARATOR_COLOR, borderBottomWidth: 1 }]}>
            <CaretLeftIcon size={24} color={getColor('text-primary')} />
            <AppText medium style={tailwind('text-base text-primary ml-1')}>
              {actionStrings.back}
            </AppText>
          </View>
        </TouchableOpacity>

        {visibleActions.map((action, index) => (
          <ActionRow
            key={action.key}
            icon={action.icon}
            label={action.label}
            onPress={action.onPress}
            isDestructive={action.isDestructive}
            isLast={index === visibleActions.length - 1}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  row: {
    height: 52,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  iconContainer: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MoreActionsBottomSheet;
