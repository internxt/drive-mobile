import { useCallback, useRef, useState } from 'react';
import { Animated, Keyboard, TextInput } from 'react-native';

const SEARCH_BAR_EXPANDED_HEIGHT = 46;
const SEARCH_OPEN_DURATION_MS = 200;
const SEARCH_OPEN_OPACITY_DURATION_MS = 180;
const SEARCH_CLOSE_DURATION_MS = 180;
const SEARCH_CLOSE_OPACITY_DURATION_MS = 150;

export interface UseSearchAnimationResult {
  searchHeight: Animated.Value;
  searchOpacity: Animated.Value;
  isSearchOpen: boolean;
  searchRef: React.RefObject<TextInput>;
  toggleSearch: (onClose?: () => void) => void;
  resetSearch: () => void;
}

export const useSearchAnimation = (): UseSearchAnimationResult => {
  const searchHeight = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const toggleSearch = useCallback(
    (onClose?: () => void) => {
      if (isSearchOpen) {
        Keyboard.dismiss();
        Animated.parallel([
          Animated.timing(searchHeight, { toValue: 0, duration: SEARCH_CLOSE_DURATION_MS, useNativeDriver: false }),
          Animated.timing(searchOpacity, {
            toValue: 0,
            duration: SEARCH_CLOSE_OPACITY_DURATION_MS,
            useNativeDriver: false,
          }),
        ]).start(() => {
          setIsSearchOpen(false);
          onClose?.();
        });
      } else {
        setIsSearchOpen(true);
        Animated.parallel([
          Animated.timing(searchHeight, {
            toValue: SEARCH_BAR_EXPANDED_HEIGHT,
            duration: SEARCH_OPEN_DURATION_MS,
            useNativeDriver: false,
          }),
          Animated.timing(searchOpacity, {
            toValue: 1,
            duration: SEARCH_OPEN_OPACITY_DURATION_MS,
            useNativeDriver: false,
          }),
        ]).start(() => searchRef.current?.focus());
      }
    },
    [isSearchOpen, searchHeight, searchOpacity],
  );

  const resetSearch = useCallback(() => {
    searchHeight.setValue(0);
    searchOpacity.setValue(0);
    setIsSearchOpen(false);
  }, [searchHeight, searchOpacity]);

  return { searchHeight, searchOpacity, isSearchOpen, searchRef, toggleSearch, resetSearch };
};
