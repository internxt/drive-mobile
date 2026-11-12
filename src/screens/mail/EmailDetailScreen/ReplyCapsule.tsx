import { ArrowBendDoubleUpLeftIcon, ArrowBendUpLeftIcon, ArrowBendUpRightIcon, type Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';

export const REPLY_CAPSULE_BOTTOM = 16;
export const REPLY_CAPSULE_HEIGHT = 52;

const BUTTON_SIZE = 44;
const REPLY_ICON_SIZE = 19;
const SECONDARY_ICON_SIZE = 21;
const DISABLED_OPACITY = 0.5;
const BUTTON_GAP = 2;
const CAPSULE_PADDING = 4;
const REPLY_BUTTON_TRAILING_PADDING = 20;
const CAPSULE_SHADOW = '0px 8px 28px rgba(0, 0, 0, 0.12), 0px 0px 0px 1px rgba(0, 0, 0, 0.05)';
const REPLY_BUTTON_LEADING_PADDING = 16;

export const ReplyCapsule = ({
  isBusy,
  canReplyAll,
  canForward,
  onReply,
  onReplyAll,
  onForward,
}: {
  isBusy: boolean;
  canReplyAll: boolean;
  canForward: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}) => {
  const getColor = useGetColor();
  const { actions } = strings.screens.email_detail;

  const renderSecondaryButton = (label: string, ActionIcon: Icon, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isBusy}
      onPress={onPress}
      cssInterop={false}
      style={({ pressed }) => [
        styles.iconButton,
        {
          marginLeft: BUTTON_GAP,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          backgroundColor: pressed ? getColor('bg-gray-5') : undefined,
        },
      ]}
    >
      <ActionIcon size={SECONDARY_ICON_SIZE} color={getColor('text-gray-80')} />
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      className="absolute items-center"
      style={{ left: 0, right: 0, bottom: REPLY_CAPSULE_BOTTOM }}
    >
      <View
        className="flex-row items-center rounded-full"
        style={{
          padding: CAPSULE_PADDING,
          backgroundColor: getColor('bg-surface'),
          boxShadow: CAPSULE_SHADOW,
          opacity: isBusy ? DISABLED_OPACITY : 1,
        }}
      >
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onReply}
          cssInterop={false}
          style={({ pressed }) => [
            styles.replyButton,
            {
              paddingRight: REPLY_BUTTON_TRAILING_PADDING,
              height: BUTTON_SIZE,
              backgroundColor: pressed ? getColor('text-primary-dark') : getColor('text-primary'),
            },
          ]}
        >
          <ArrowBendUpLeftIcon size={REPLY_ICON_SIZE} weight="bold" color={getColor('text-white')} />
          <AppText semibold className="ml-2 text-base" style={{ color: getColor('text-white') }}>
            {actions.reply}
          </AppText>
        </Pressable>
        {canReplyAll && renderSecondaryButton(actions.replyAll, ArrowBendDoubleUpLeftIcon, onReplyAll)}
        {canForward && renderSecondaryButton(actions.forward, ArrowBendUpRightIcon, onForward)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUTTON_SIZE / 2,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BUTTON_SIZE / 2,
    paddingLeft: REPLY_BUTTON_LEADING_PADDING,
  },
});
