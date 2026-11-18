import { ArrowSquareOutIcon, ArrowsOutCardinalIcon, DotsThreeIcon, TrashIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { TAB_BAR_HEIGHT } from 'src/components/FloatingActionButton/floatingButtonLayout';
import useGetColor from 'src/hooks/useColor';
import strings from '../../../../assets/lang/strings';

const TAB_BAR_COLLAPSE_DURATION_MS = 250;
const SHOW_DURATION_MS = 200;
const HIDE_DURATION_MS = 150;
const ACTION_ICON_SIZE = 26;
const ACTION_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

interface DriveSelectionToolbarProps {
  visible: boolean;
  moveDisabled: boolean;
  exportDisabled: boolean;
  trashDisabled: boolean;
  moreDisabled: boolean;
  onMovePress: () => void;
  onExportPress: () => void;
  onTrashPress: () => void;
  onMorePress: () => void;
}

interface ToolbarActionProps {
  icon: React.ReactElement;
  label: string;
  disabled: boolean;
  onPress?: () => void;
}

const ToolbarAction = ({ icon, label, disabled, onPress }: ToolbarActionProps): JSX.Element => (
  <TouchableOpacity
    disabled={disabled}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    style={styles.action}
    hitSlop={ACTION_HIT_SLOP}
  >
    {icon}
  </TouchableOpacity>
);

const SHOW_TIMING = { duration: SHOW_DURATION_MS, easing: Easing.out(Easing.cubic) };
const HIDE_TIMING = { duration: HIDE_DURATION_MS, easing: Easing.in(Easing.cubic) };
const VISIBILITY_HIDDEN = 0;
const VISIBILITY_SHOWN = 1;
const MIN_VISIBLE_PROGRESS = 0.01;

export const DriveSelectionToolbar = ({
  visible,
  moveDisabled,
  exportDisabled,
  trashDisabled,
  moreDisabled,
  onMovePress,
  onExportPress,
  onTrashPress,
  onMorePress,
}: DriveSelectionToolbarProps): JSX.Element => {
  const getColor = useGetColor();
  const visibility = useSharedValue(visible ? VISIBILITY_SHOWN : VISIBILITY_HIDDEN);

  useEffect(() => {
    visibility.value = visible
      ? withDelay(TAB_BAR_COLLAPSE_DURATION_MS, withTiming(VISIBILITY_SHOWN, SHOW_TIMING))
      : withTiming(VISIBILITY_HIDDEN, HIDE_TIMING);
  }, [visible]);

  const toolbarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: visibility.value < MIN_VISIBLE_PROGRESS ? 0 : 1,
    transform: [
      { translateY: interpolate(visibility.value, [VISIBILITY_HIDDEN, VISIBILITY_SHOWN], [TAB_BAR_HEIGHT, 0]) },
    ],
  }));

  const disabledColor = getColor('text-gray-30');

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.bar,
        { backgroundColor: getColor('bg-surface'), borderTopColor: getColor('border-gray-10') },
        toolbarAnimatedStyle,
      ]}
    >
      <ToolbarAction
        icon={
          <ArrowsOutCardinalIcon
            size={ACTION_ICON_SIZE}
            color={moveDisabled ? disabledColor : getColor('text-primary')}
          />
        }
        label={strings.buttons.move}
        disabled={moveDisabled}
        onPress={onMovePress}
      />
      <ToolbarAction
        icon={
          <ArrowSquareOutIcon
            size={ACTION_ICON_SIZE}
            color={exportDisabled ? disabledColor : getColor('text-primary')}
          />
        }
        label={strings.screens.drive.selection.export}
        disabled={exportDisabled}
        onPress={onExportPress}
      />
      <ToolbarAction
        icon={<TrashIcon size={ACTION_ICON_SIZE} color={trashDisabled ? disabledColor : getColor('text-primary')} />}
        label={strings.buttons.moveToThrash}
        disabled={trashDisabled}
        onPress={onTrashPress}
      />
      <ToolbarAction
        icon={
          <DotsThreeIcon
            weight="bold"
            size={ACTION_ICON_SIZE}
            color={moreDisabled ? disabledColor : getColor('text-primary')}
          />
        }
        label={strings.screens.drive.selection.moreActions}
        disabled={moreDisabled}
        onPress={onMorePress}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
