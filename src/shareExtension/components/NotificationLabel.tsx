import { CheckCircleIcon, WarningCircleIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { fontStyles, useShareColors } from '../theme';

type NotificationType = 'success' | 'error';

interface NotificationLabelProps {
  visible: boolean;
  type: NotificationType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  dismissAfter?: number;
}

export const NotificationLabel = ({
  visible,
  type,
  message,
  actionLabel,
  onAction,
  onDismiss,
  dismissAfter,
}: NotificationLabelProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  const translateY = useRef(new Animated.Value(80)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (!visible || !dismissAfter) return;
    const timer = setTimeout(onDismiss, dismissAfter);
    return () => clearTimeout(timer);
  }, [visible, dismissAfter, onDismiss]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShouldRender(false));
    }
  }, [visible, translateY]);

  if (!shouldRender) return null;

  const isSuccess = type === 'success';
  const iconColor = isSuccess ? colors.successGreen : colors.red;
  const Icon = isSuccess ? CheckCircleIcon : WarningCircleIcon;
  const hasAction = isSuccess && !!actionLabel && !!onAction;

  return (
    <Animated.View style={[tailwind('mx-4'), { transform: [{ translateY }] }]}>
      <View
        style={[
          tailwind('flex-row items-center rounded-lg px-3 py-3'),
          {
            backgroundColor: isSuccess ? colors.surface : colors.redBg,
            borderWidth: 1,
            borderColor: isSuccess ? colors.gray10 : colors.redBorder,
            gap: 6,
            minHeight: 48,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <Icon size={20} color={iconColor} weight="fill" />
        <Text style={[tailwind('flex-1 text-base'), fontStyles.regular, { lineHeight: 19, color: colors.gray100 }]} numberOfLines={2}>
          {message}
        </Text>
        {hasAction ? (
          <TouchableOpacity onPress={onAction} hitSlop={8}>
            <Text style={[tailwind('text-base'), fontStyles.medium, { color: colors.primary }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : !isSuccess ? (
          <TouchableOpacity onPress={onDismiss} hitSlop={8}>
            <XIcon size={20} color={colors.gray60} />
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};
