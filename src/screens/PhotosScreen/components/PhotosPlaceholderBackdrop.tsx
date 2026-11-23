import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { SharedValue, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import useGetColor from 'src/hooks/useColor';
import { getPlaceholderBackdropFrame } from '../utils/photoTimelineLayout';

const PLACEHOLDER_BORDER_RADIUS = 2;

interface PhotosPlaceholderBackdropProps {
  scrollOffset: SharedValue<number>;
  contentTopInset: number;
  rowCount: number;
  numColumns: number;
  cellPadding: number;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Grid of placeholder squares drawn behind the timeline list and moved with its scroll offset on the
 * UI thread, so rows the list has not rendered yet show placeholders instead of the background.
 */
const PhotosPlaceholderBackdrop = ({
  scrollOffset,
  contentTopInset,
  rowCount,
  numColumns,
  cellPadding,
  viewportWidth,
  viewportHeight,
}: PhotosPlaceholderBackdropProps) => {
  const getColor = useGetColor();
  const cellSize = viewportWidth / numColumns;

  const backdropFrame = useDerivedValue(() =>
    getPlaceholderBackdropFrame({
      scrollOffset: scrollOffset.value,
      contentTopInset,
      rowHeight: cellSize,
      rowCount,
      viewportHeight,
    }),
  );
  const frameStyle = useAnimatedStyle(() => ({
    top: backdropFrame.value.visibleTop,
    height: backdropFrame.value.visibleHeight,
  }));
  const rowsStyle = useAnimatedStyle(() => ({ transform: [{ translateY: backdropFrame.value.firstRowOffset }] }));

  if (cellSize <= 0 || viewportHeight <= 0) {
    return null;
  }

  const visibleRowCount = Math.ceil(viewportHeight / cellSize) + 1;
  const placeholderSize = cellSize - 2 * cellPadding;
  const placeholderColor = getColor('bg-gray-1');

  return (
    <Reanimated.View pointerEvents="none" style={[styles.frame, frameStyle]}>
      <Reanimated.View style={rowsStyle}>
        {Array.from({ length: visibleRowCount }, (_, rowIndex) => (
          <View key={rowIndex} style={{ height: cellSize }}>
            {Array.from({ length: numColumns }, (__, columnIndex) => (
              <View
                key={columnIndex}
                style={[
                  styles.placeholder,
                  {
                    left: columnIndex * cellSize + cellPadding,
                    top: cellPadding,
                    width: placeholderSize,
                    height: placeholderSize,
                    backgroundColor: placeholderColor,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </Reanimated.View>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    borderRadius: PLACEHOLDER_BORDER_RADIUS,
  },
});

export default memo(PhotosPlaceholderBackdrop);
