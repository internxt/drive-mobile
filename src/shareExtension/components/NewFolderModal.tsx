import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableHighlight, View } from 'react-native';
import strings from '../../../assets/lang/strings';
import { HTTP_CONFLICT } from '../../services/common';
import { fontStyles, useShareColors } from '../theme';

interface NewFolderModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const NewFolderModal = ({ visible, onCancel, onCreate }: NewFolderModalProps) => {
  const colors = useShareColors();
  const [name, setName] = useState(strings.screens.create_folder.defaultName);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCreatingRef = useRef(false);

  const handleCreate = async () => {
    if (isCreatingRef.current) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError(strings.screens.ShareExtension.folderNameEmpty);
      return;
    }
    setError(null);
    isCreatingRef.current = true;
    setLoading(true);
    try {
      await onCreate(trimmed);
      setName(strings.screens.create_folder.defaultName);
      onCancel();
    } catch (error) {
      setError(
        (error as { status: number }).status === HTTP_CONFLICT
          ? strings.screens.ShareExtension.folderAlreadyExists
          : strings.screens.ShareExtension.folderCreateError,
      );
    } finally {
      isCreatingRef.current = false;
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(strings.screens.create_folder.defaultName);
    setError(null);
    onCancel();
  };

  const handleChangeName = useCallback((text: string) => {
    setName(text);
    setError(null);
  }, []);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  const inputBorderColor = () => {
    if (error) return colors.red;
    if (focused) return colors.primary;
    return colors.gray20;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={handleCancel}
      >
        <Pressable className="w-full rounded-xl p-4" style={{ backgroundColor: colors.surface }}>
          <Text className="text-xl mb-6" style={[fontStyles.semibold, { color: colors.gray100 }]}>
            {strings.buttons.newFolder}
          </Text>

          <View className="mb-8">
            <Text className="text-sm mb-1" style={{ color: colors.gray100 }}>
              {strings.screens.ShareExtension.folderNameLabel}
            </Text>
            <View
              className="flex-row items-center rounded-lg border py-1.5"
              style={{
                borderColor: inputBorderColor(),
              }}
            >
              <TextInput
                className="flex-1 py-2 px-4 text-base"
                style={{ color: colors.gray80 }}
                placeholder={strings.screens.ShareExtension.folderNamePlaceholder}
                placeholderTextColor={colors.gray40}
                value={name}
                onChangeText={handleChangeName}
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={!loading}
                autoFocus
                autoCorrect={false}
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
            {error ? (
              <Text className="mt-1 text-sm" style={{ color: colors.red }}>
                {error}
              </Text>
            ) : null}
          </View>

          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableHighlight
              className="flex-1 rounded-lg px-4 py-3 items-center justify-center border"
              style={{ backgroundColor: colors.surface, borderColor: colors.gray10 }}
              underlayColor={colors.gray10}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: colors.gray80 }}>
                {strings.buttons.cancel}
              </Text>
            </TouchableHighlight>

            <TouchableHighlight
              className="flex-1 rounded-lg px-4 py-3 items-center justify-center"
              style={{ backgroundColor: !name.trim() || loading ? colors.primaryDisabled : colors.primary }}
              underlayColor="rgb(0, 88, 219)"
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text className="text-base" style={[fontStyles.semibold, { color: colors.white }]}>
                  {strings.buttons.create}
                </Text>
              )}
            </TouchableHighlight>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
