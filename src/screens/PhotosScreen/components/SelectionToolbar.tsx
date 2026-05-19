import { DotsThreeIcon, ExportIcon, InfoIcon, TrashIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { TimelinePhotoItem } from '../types';
import { isItemBacked } from '../utils/photoUtils';

const TOOLBAR_HEIGHT = 72;
const TAB_BAR_COLLAPSE_DURATION = 250;
const SHOW_DURATION = 200;
const HIDE_DURATION = 150;

const animateHeight = (anim: Animated.Value, toValue: number, duration: number, easing: (time: number) => number) =>
  Animated.timing(anim, { toValue, duration, easing, useNativeDriver: false });

interface SelectionToolbarProps {
  visible: boolean;
  selectedItems: TimelinePhotoItem[];
  onExport: () => void;
  onFavorite: () => void;
  onMore: () => void;
  onDelete: () => void;
  onInfo: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactElement;
  label: string;
  onPress: () => void;
  color: string;
}

const ToolbarButton = ({ icon, label, onPress, color }: ToolbarButtonProps): JSX.Element => (
  <TouchableOpacity onPress={onPress} style={styles.button} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
    {icon}
    <AppText style={[styles.label, { color }]}>{label}</AppText>
  </TouchableOpacity>
);

const SelectionToolbar = ({
  visible,
  selectedItems,
  onExport,
  onFavorite,
  onMore,
  onDelete,
  onInfo,
}: SelectionToolbarProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const heightRef = useRef(new Animated.Value(visible ? TOOLBAR_HEIGHT : 0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (visible) {
      const timer = setTimeout(() => {
        animRef.current = animateHeight(heightRef, TOOLBAR_HEIGHT, SHOW_DURATION, Easing.out(Easing.cubic));
        animRef.current.start();
      }, TAB_BAR_COLLAPSE_DURATION);
      return () => clearTimeout(timer);
    } else {
      animRef.current = animateHeight(heightRef, 0, HIDE_DURATION, Easing.in(Easing.cubic));
      animRef.current.start();
    }
  }, [visible]);

  useEffect(
    () => () => {
      animRef.current?.stop();
    },
    [],
  );

  const allBacked = selectedItems.every(isItemBacked);

  const iconColor = getColor('text-gray-60');
  const redColor = getColor('text-red');
  const toolbarTexts = strings.screens.photos.selection.toolbar;

  return (
    <Animated.View style={{ height: heightRef, overflow: 'hidden' }} pointerEvents={visible ? 'box-none' : 'none'}>
      <View
        style={[
          styles.sheet,
          { backgroundColor: getColor('bg-surface'), position: 'absolute', bottom: 0, left: 0, right: 0 },
        ]}
      >
        <View style={styles.pullBar}>
          <View style={[tailwind('bg-gray-20'), styles.pill]} />
        </View>

        <View style={styles.navbar}>
          {allBacked ? (
            <>
              <ToolbarButton
                icon={<ExportIcon size={26} color={iconColor} />}
                label={toolbarTexts.export}
                onPress={onExport}
                color={iconColor}
              />
              {/* <ToolbarButton
                icon={<StarIcon size={26} color={iconColor} />}
                label={toolbarTexts.favorite}
                onPress={onFavorite}
                color={iconColor}
              /> */}
              <ToolbarButton
                icon={<DotsThreeIcon size={26} color={iconColor} />}
                label={toolbarTexts.more}
                onPress={onMore}
                color={iconColor}
              />
              <ToolbarButton
                icon={<TrashIcon size={26} color={redColor} />}
                label={toolbarTexts.delete}
                onPress={onDelete}
                color={redColor}
              />
            </>
          ) : (
            <>
              <ToolbarButton
                icon={<DotsThreeIcon size={26} color={iconColor} />}
                label={toolbarTexts.more}
                onPress={onMore}
                color={iconColor}
              />
              <ToolbarButton
                icon={<InfoIcon size={26} color={iconColor} />}
                label={toolbarTexts.info}
                onPress={onInfo}
                color={iconColor}
              />
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    paddingBottom: 4,
  },
  pullBar: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 48,
    height: 4,
    borderRadius: 2,
  },
  navbar: {
    height: 48,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 10,
    marginTop: 2,
  },
});

export default SelectionToolbar;
