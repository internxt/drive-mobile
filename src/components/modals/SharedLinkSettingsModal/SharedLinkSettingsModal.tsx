import strings from 'assets/lang/strings';
import { Check, Copy, Eye, EyeSlash } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppSwitch from 'src/components/AppSwitch';
import AppText from 'src/components/AppText';
import AppTextInput from 'src/components/AppTextInput';
import { useTailwind } from 'tailwind-rn';
import BottomModal from '../BottomModal';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import * as Clipboard from 'expo-clipboard';
import { useKeyboard } from '@internxt-mobile/hooks/useKeyboard';
import { animations } from './animations';
import { GeneratingLinkModal } from '../common/GeneratingLinkModal';
import { driveActions } from 'src/store/slices/drive';
export interface SharedLinkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCreatingShareLink: boolean;
}

const PASSWORD_PLACEHOLDER = 'xxxxxxxxxxxx';
export const SharedLinkSettingsModal: React.FC<SharedLinkSettingsModalProps> = ({
  isOpen,
  onClose,
  isCreatingShareLink,
}) => {
  const { keyboardHeight, keyboardShown } = useKeyboard();
  const tailwind = useTailwind();
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

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  const handleToggleProtectWithPassword = (protectWithPassword: boolean) => {
    setPasswordError(false);
    if (protectWithPassword !== isAlreadyPasswordProtected && !isCreatingShareLink) {
      setShouldSave(true);
    } else {
      setShouldSave(false);
    }
    setProtectWithPassword(protectWithPassword);
  };

  const handleChangePasswordText = (newPassword: string) => {
    if (newPassword && newPassword !== PASSWORD_PLACEHOLDER && !isCreatingShareLink) {
      setShouldSave(true);
    }
    setShareLinkPassword(newPassword);
  };

  const handleCopyLinkPress = async () => {
    if (protectWithPassword && !shareLinkPassword) {
      // You ned to provide a password
      setPasswordError(true);
      return;
    } else {
      setPasswordError(false);
    }
    if (generatedShareLink) {
      Clipboard.setString(generatedShareLink);
    } else {
      const isFolder = item?.type ? false : true;
      if (item?.token && item?.code) {
        const existingLink = await driveUseCases.getExistingShareLink({
          code: item.code,
          token: item.token,
          type: isFolder ? 'folder' : 'file',
        });
        if (!existingLink) return;
        setGeneratedShareLink(existingLink);
        Clipboard.setString(existingLink);
      } else {
        setIsProcessingLink(true);
        const result = await driveUseCases.generateShareLink({
          itemId: item?.id.toString() as string,
          fileId: item?.fileId,
          displayCopyNotification: false,
          type: isFolder ? 'folder' : 'file',
          plainPassword: shareLinkPassword,
        });

        if (!result?.link) return;
        setGeneratedShareLink(result.link);
        Clipboard.setString(result.link);
      }

      setIsProcessingLink(false);
    }
  };

  const handleSaveShareLinkChanges = async () => {
    if (!focusedShareItem) return;
    if (!item) return;
    if (protectWithPassword && !shareLinkPassword) {
      // You ned to provide a password
      setPasswordError(true);
      return;
    } else {
      setPasswordError(false);
      setIsSaving(true);
    }

    setIsProcessingLink(true);

    const shouldIncludePassword = protectWithPassword ? true : false;
    const result = await driveUseCases.updateShareLink({
      plainPassword: shouldIncludePassword ? (shareLinkPassword as string) : null,
      type: item.folderId ? 'folder' : 'file',
      shareId: focusedShareItem.id,
    });

    if (result?.link) {
      setIsAlreadyPasswordProtected(shouldIncludePassword);
      setShareLinkPassword(shouldIncludePassword ? shareLinkPassword : undefined);
      setGeneratedShareLink(result.link);
      Clipboard.setString(result.link);
      setShouldSave(false);
      setIsSaving(false);
      setIsProcessingLink(false);
    }
  };

  return (
    <>
      <GeneratingLinkModal isGenerating={isProcessingLink && isCreatingShareLink} />

      <BottomModal
        header={
          <View>
            <AppText medium style={tailwind('text-xl')}>
              {strings.modals.shareLinkSettings.title}
            </AppText>
          </View>
        }
        onClosed={onClose}
        isOpen={isOpen}
        style={{ paddingBottom: keyboardShown ? keyboardHeight : 0 }}
      >
        <View style={tailwind('flex flex-row justify-between px-5 items-center mt-2')}>
          <View style={tailwind('py-2.5')}>
            <AppText style={tailwind('text-lg')}>{strings.modals.shareLinkSettings.protectWithPassword.title}</AppText>
            <AppText style={tailwind('text-xs text-gray-40')}>
              {strings.modals.shareLinkSettings.protectWithPassword.advice}
            </AppText>
          </View>
          <AppSwitch
            value={protectWithPassword}
            onChange={() => handleToggleProtectWithPassword(!protectWithPassword)}
          />
        </View>
        <Animated.View
          style={[tailwind('px-5 overflow-hidden'), { height: passwordModeHeight, opacity: passwordModeOpacity }]}
        >
          <View style={[tailwind('py-2')]}>
            <AppTextInput
              status={passwordError ? ['error', ''] : undefined}
              onChangeText={handleChangePasswordText}
              inputRef={inputRef}
              value={shareLinkPassword}
              secureTextEntry={showPassword ? false : true}
              renderAppend={() => (
                <TouchableWithoutFeedback onPress={toggleShowPassword}>
                  <View>
                    {showPassword ? (
                      <EyeSlash size={24} color={tailwind('text-gray-100').color as string} />
                    ) : (
                      <Eye size={24} color={tailwind('text-gray-100').color as string} />
                    )}
                  </View>
                </TouchableWithoutFeedback>
              )}
            />
          </View>
        </Animated.View>
        <View style={tailwind('px-5 mt-4')}>
          {!isCreatingShareLink && <View style={tailwind('border-b border-gray-10')} />}
        </View>
        <>
          {!isCreatingShareLink ? (
            <>
              <View style={tailwind('flex flex-row px-5 flex items-center justify-between py-4 mb-4')}>
                <AppText style={tailwind('text-lg')}>Views</AppText>
                <AppText style={tailwind('text-gray-60')}>{focusedShareItem?.views || 'No views yet'}</AppText>
              </View>
            </>
          ) : null}
        </>

        <Animated.View
          style={[tailwind('px-5 overflow-hidden'), { height: copyLinkActionsHeight, opacity: copyLinkActionsOpacity }]}
        >
          <AppButton
            style={tailwind('flex-1 mr-1')}
            title={
              <View style={tailwind('flex flex-row items-center')}>
                {!generatedShareLink && (
                  <Copy color={tailwind('text-white').color as string} style={tailwind('mr-2')} />
                )}
                {!isProcessingLink && generatedShareLink && (
                  <Check color={tailwind('text-primary').color as string} style={tailwind('mr-2')} />
                )}
                <AppText
                  medium
                  numberOfLines={1}
                  style={[tailwind('text-lg'), generatedShareLink ? tailwind('text-primary') : tailwind('text-white')]}
                >
                  {generatedShareLink ? strings.buttons.linkCopiedToClipboard : strings.buttons.copyLink}
                </AppText>
              </View>
            }
            type={generatedShareLink ? 'accept-2' : 'accept'}
            onPress={handleCopyLinkPress}
          ></AppButton>
        </Animated.View>
        <Animated.View
          style={[
            tailwind('flex flex-row px-5 overflow-hidden'),
            { height: saveActionsHeight, opacity: saveActionsOpacity },
          ]}
        >
          <AppButton
            style={tailwind('flex-1 mr-1')}
            title={strings.buttons.dismiss}
            type={'cancel'}
            onPress={function (): void {
              throw new Error('Function not implemented.');
            }}
          ></AppButton>
          <AppButton
            loading={isSaving}
            style={tailwind('flex-1 ml-1')}
            type="accept"
            title={strings.buttons.save}
            onPress={handleSaveShareLinkChanges}
          ></AppButton>
        </Animated.View>
      </BottomModal>
    </>
  );
};
