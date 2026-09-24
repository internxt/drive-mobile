import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../../hooks/useColor';
import { COMPOSE_LABEL_WIDTH, COMPOSE_ROW_HEIGHT, composeFieldTextStyle } from './composeFieldStyles';

type ComposeFieldRowProps = {
  label: string;
  children: ReactNode;
  renderAppend?: ReactNode;
  hasCompactLabel?: boolean;
};

/**
 * One line of the compose header: a gray label, the field itself, and a full width separator
 * underneath.
 *
 * @param props.label - Text shown to the left of the field.
 * @param props.children - The field, which takes the rest of the line.
 * @param props.renderAppend - Element pinned to the right end of the line.
 * @param props.hasCompactLabel - Sizes the label to its text instead of the width shared by the compose rows.
 */
export const ComposeFieldRow = ({
  label,
  children,
  renderAppend,
  hasCompactLabel,
}: ComposeFieldRowProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View
      style={[
        tailwind('flex-row items-center px-4'),
        { minHeight: COMPOSE_ROW_HEIGHT, borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
      ]}
    >
      <Text
        style={[
          composeFieldTextStyle,
          hasCompactLabel ? tailwind('mr-2') : { width: COMPOSE_LABEL_WIDTH },
          { color: getColor('text-gray-50') },
        ]}
      >
        {label}
      </Text>
      <View style={tailwind('flex-1')}>{children}</View>
      {renderAppend}
    </View>
  );
};
