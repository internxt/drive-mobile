import { useKeyboard } from '@internxt-mobile/hooks/useKeyboard';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import strings from 'assets/lang/strings';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, StyleSheet, TextInput, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { driveActions } from 'src/store/slices/drive';
import { checkIsFolder } from '../../../helpers';
import BottomModal from '../BottomModal';
import { GeneratingLinkModal } from '../common/GeneratingLinkModal';
import { animations } from './animations';
import useGetColor from 'src/hooks/useColor';

export interface SharedLinkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCreatingShareLink: boolean;
}

const PASSWORD_PLACEHOLDER = 'xxxxxxxxxxxx';
const ACTIONS_HORIZONTAL_PADDING = 20;
export const SharedLinkSettingsModal: React.FC<SharedLinkSettingsModalProps> = ({
  isOpen,
  onClose,
  isCreatingShareLink,
}) => {
  const { keyboardHeight, keyboardShown } = useKeyboard();
  const getColor = useGetColor();
  const { focusedItem: item, focusedShareItem } = useAppSelector((state) => state.drive);
  const dispatch = useAppDispatch();

  // State
  const [protectWithPassword, setProtectWithPassword] = useState(true);
  const [passwordError, setPasswordError] = useState(false);
  const [isAlreadyPasswordProtected, setIsAlreadyPasswordProtected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(false);
  const [shareLinkPassword, setShareLinkPassword] = useState<string | undefined>(undefined);
  const [generatedShareLink, setGeneratedShareLink] = useState<null | string>(null);
  const [shouldSave, setShouldSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for animations and views
  const saveActionsHeight = useRef(new Animated.Value(0)).current;
  const saveActionsOpacity = useRef(new Animated.Value(0)).current;
  const copyLinkActionsHeight = useRef(new Animated.Value(1)).current;
  const copyLinkActionsOpacity = useRef(new Animated.Value(1)).current;
  const passwordModeOpacity = useRef(new Animated.Value(0)).current;
  const passwordModeHeight = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput | null>(null);

  const animate = animations({
    copyLinkActionsHeight,
    copyLinkActionsOpacity,
    saveActionsHeight,
    saveActionsOpacity,
    passwordModeHeight,
    passwordModeOpacity,
  });

  useEffect(() => {
    setIsAlreadyPasswordProtected(focusedShareItem?.hashedPassword ? true : false);
    if (focusedShareItem?.hashedPassword) {
      setShareLinkPassword(PASSWORD_PLACEHOLDER);
    }
    setProtectWithPassword(focusedShareItem?.hashedPassword ? true : false);
  }, [focusedShareItem?.id, isOpen]);

  useEffect(() => {
    // Since this modal is not unmounted, we
    // should reset the state manually
    if (!isOpen) {
      setProtectWithPassword(false);
      setShowPassword(false);
      setIsProcessingLink(false);
      setShareLinkPassword(undefined);
      setGeneratedShareLink(null);
      setPasswordError(false);
      setShouldSave(false);
      setIsProcessingLink(false);
      setIsSaving(false);
      dispatch(driveActions.setFocusedShareItem(null));
    }
  }, [isOpen]);

  useEffect(() => {
    if (shouldSave) {
      animate.displaySaveActions(true);
    } else {
      Keyboard.dismiss();
      animate.displayCopyActions(true);
    }
  }, [shouldSave]);

  useEffect(() => {
    animate.displayPasswordMode(protectWithPassword);
  }, [protectWithPassword]);

  useEffect(() => {
    animate.displayPasswordMode(isAlreadyPasswordProtected);
  }, [isAlreadyPasswordProtected]);

  const handleCopyLinkPress = async () => {
    try {
      if (protectWithPassword && !shareLinkPassword) {
        // You ned to provide a password
        setPasswordError(true);
        return;
      }

      setPasswordError(false);

      // If we already have a generated share link, copy it
      if (generatedShareLink) {
        await Clipboard.setStringAsync(generatedShareLink);

        return;
      }

      const isFolder = checkIsFolder(item);

      // A share link already exists, obtain it
      if (item?.token && item?.code) {
        const existingLink = await driveUseCases.generateShareLink({
          itemId: item?.uuid as string,
          fileId: item?.fileId,
          displayCopyNotification: false,
          type: isFolder ? 'folder' : 'file',
          plainPassword: shareLinkPassword,
        });
        if (!existingLink?.link) return;
        setGeneratedShareLink(existingLink?.link);
        await Clipboard.setStringAsync(existingLink?.link);

        return;
      }

      // No share link, generate it
      setIsProcessingLink(true);
      const result = await driveUseCases.generateShareLink({
        itemId: item?.uuid as string,
        fileId: item?.fileId,
        displayCopyNotification: false,
        type: isFolder ? 'folder' : 'file',
        plainPassword: shareLinkPassword,
      });

      if (!result?.link) return;
      setGeneratedShareLink(result.link);
      await Clipboard.setStringAsync(result.link);
    } catch (error) {
      notificationsService.error(strings.errors.generateShareLinkError);
    } finally {
      setIsProcessingLink(false);
    }
  };

  return (
    <>
      <GeneratingLinkModal isGenerating={isProcessingLink && isCreatingShareLink} />

      <BottomModal
        header={
          <View>
            <AppText medium className="text-xl">
              {strings.modals.shareLinkSettings.title}
            </AppText>
          </View>
        }
        onClosed={onClose}
        isOpen={isOpen}
        style={{ paddingBottom: keyboardShown ? keyboardHeight : 20 }}
      >
        <View className="px-5 mt-4">{!isCreatingShareLink && <View className="border-b border-gray-10" />}</View>
        <>
          {!isCreatingShareLink ? (
            <>
              <View className="flex flex-row px-5 flex items-center justify-between py-4 mb-4">
                <AppText className="text-lg">Views</AppText>
                <AppText className="text-gray-60">{focusedShareItem?.views || 'No views yet'}</AppText>
              </View>
            </>
          ) : null}
        </>

        <Animated.View
          style={[styles.copyLinkActions, { height: copyLinkActionsHeight, opacity: copyLinkActionsOpacity }]}
        >
          <AppButton
            className="flex-1 mr-1"
            title={
              <View className="flex flex-row items-center">
                {!generatedShareLink && (
                  <View className="mr-2">
                    <Copy color={getColor('text-white')} />
                  </View>
                )}
                {!isProcessingLink && generatedShareLink && (
                  <View className="mr-2">
                    <Check color={getColor('text-primary')} />
                  </View>
                )}
                <AppText
                  medium
                  numberOfLines={1}
                  className={`text-lg ${generatedShareLink ? 'text-primary' : 'text-white'}`}
                >
                  {generatedShareLink ? strings.buttons.linkCopiedToClipboard : strings.buttons.copyLink}
                </AppText>
              </View>
            }
            type={generatedShareLink ? 'accept-2' : 'accept'}
            onPress={handleCopyLinkPress}
          ></AppButton>
        </Animated.View>
        {/* <Animated.View
          style={[
            styles.copyLinkActions,
            { flexDirection: 'row' },
            { height: saveActionsHeight, opacity: saveActionsOpacity },
          ]}
        >
          <AppButton
            className="flex-1 mr-1"
            title={strings.buttons.dismiss}
            type={'cancel'}
            onPress={handleDismiss}
          ></AppButton>
          <AppButton
            loading={isSaving}
            className="flex-1 ml-1"
            type="accept"
            title={strings.buttons.save}
            onPress={handleSaveShareLinkChanges}
          ></AppButton>
        </Animated.View> */}
      </BottomModal>
    </>
  );
};

const styles = StyleSheet.create({
  copyLinkActions: {
    paddingHorizontal: ACTIONS_HORIZONTAL_PADDING,
    overflow: 'hidden',
  },
});
