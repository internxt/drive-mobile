import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableHighlight, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { colors, fontStyles } from '../theme';

interface NewFolderModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const NewFolderModal = ({ visible, onCancel, onCreate }: NewFolderModalProps) => {
  const tailwind = useTailwind();
  const [name, setName] = useState(strings.screens.create_folder.defaultName);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(strings.screens.ShareExtension.folderNameEmpty);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreate(trimmed);
      setName(strings.screens.create_folder.defaultName);
      onCancel();
    } catch {
      setError(strings.screens.ShareExtension.folderCreateError);
    } finally {
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable
        style={[tailwind('flex-1 items-center justify-center px-5'), { backgroundColor: 'rgba(0,0,0,0.4)' }]}
        onPress={handleCancel}
      >
        <View style={tailwind('w-full bg-white rounded-xl p-4')}>
          <Text style={[tailwind('text-xl text-gray-100 mb-6'), fontStyles.semibold]}>{strings.buttons.newFolder}</Text>

          <View style={tailwind('mb-8')}>
            <Text style={tailwind('text-sm text-gray-100 mb-1')}>{strings.screens.ShareExtension.folderNameLabel}</Text>
            <View
              style={[
                tailwind('flex-row items-center rounded-lg border py-1.5'),
                {
                  borderColor: focused ? colors.primary : colors.gray20,
                },
                !!error && { borderColor: colors.red },
              ]}
            >
              <TextInput
                style={tailwind('flex-1 py-2 px-4 text-base text-gray-80')}
                placeholder={strings.screens.ShareExtension.folderNamePlaceholder}
                placeholderTextColor={colors.gray40}
                value={name}
                onChangeText={handleChangeName}
                onFocus={handleFocus}
                onBlur={handleBlur}
                autoFocus
                autoCorrect={false}
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
            {error ? <Text style={tailwind('mt-1 text-sm text-red')}>{error}</Text> : null}
          </View>

          <View style={[tailwind('flex-row'), { gap: 8 }]}>
            <TouchableHighlight
              style={[
                tailwind('flex-1 rounded-lg px-4 py-3 items-center justify-center bg-white border border-gray-10'),
              ]}
              underlayColor={colors.gray10}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={[tailwind('text-base'), { color: colors.gray80 }]}>{strings.buttons.cancel}</Text>
            </TouchableHighlight>

            <TouchableHighlight
              style={[
                tailwind('flex-1 rounded-lg px-4 py-3 items-center justify-center'),
                { backgroundColor: !name.trim() || loading ? colors.primaryDisabled : colors.primary },
              ]}
              underlayColor="rgb(0, 88, 219)"
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={[tailwind('text-base text-white'), fontStyles.semibold]}>{strings.buttons.create}</Text>
              )}
            </TouchableHighlight>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};
