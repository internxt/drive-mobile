import { useEffect, useRef, useState } from 'react';
import { ContextMenuItem, EnrichedTextInput, EnrichedTextInputInstance } from 'react-native-enriched-html';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import strings from '../../../../../assets/lang/strings';
import useGetColor from '../../../../hooks/useColor';
import { unwrapEditorHtml } from '../utils/composeBodyHtml';
import { BodyLinkModal } from './BodyLinkModal';

const BODY_EDITOR_MIN_HEIGHT = 200;

type SelectionToLink = { start: number; end: number; text: string };

type ComposeBodyEditorProps = {
  initialBody: string;
  onChangeBody: (body: string) => void;
  onReady: () => void;
};

export const ComposeBodyEditor = ({ initialBody, onChangeBody, onReady }: ComposeBodyEditorProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const bodyEditorRef = useRef<EnrichedTextInputInstance>(null);
  const [editorInitialBody] = useState(initialBody);
  const [isLinkSelected, setIsLinkSelected] = useState(false);
  const [selectionToLink, setSelectionToLink] = useState<SelectionToLink | null>(null);
  const { textStyles } = strings.screens.compose_email;
  const textColor = getColor('text-gray-100');

  useEffect(() => {
    const bodyEditor = bodyEditorRef.current;
    if (!bodyEditor) {
      onReady();
      return;
    }
    bodyEditor
      .getHTML()
      .then((editorHtml) => {
        onChangeBody(unwrapEditorHtml(editorHtml));
        onReady();
      })
      .catch((error) => {
        logger.warn('Failed to read the body the editor starts with', error);
        onReady();
      });
  }, []);

  const addLink = (url: string) => {
    if (selectionToLink) {
      bodyEditorRef.current?.setLink(selectionToLink.start, selectionToLink.end, selectionToLink.text || url, url);
    }
    setSelectionToLink(null);
  };

  const contextMenuItems: ContextMenuItem[] = [
    { text: textStyles.bold, onPress: () => bodyEditorRef.current?.toggleBold() },
    { text: textStyles.italic, onPress: () => bodyEditorRef.current?.toggleItalic() },
    { text: textStyles.underline, onPress: () => bodyEditorRef.current?.toggleUnderline() },
    { text: textStyles.strikethrough, onPress: () => bodyEditorRef.current?.toggleStrikeThrough() },
    { text: textStyles.bulletList, onPress: () => bodyEditorRef.current?.toggleUnorderedList() },
    { text: textStyles.numberedList, onPress: () => bodyEditorRef.current?.toggleOrderedList() },
    { text: textStyles.quote, onPress: () => bodyEditorRef.current?.toggleBlockQuote() },
    {
      text: textStyles.link,
      visible: !isLinkSelected,
      onPress: ({ text, selection }) => setSelectionToLink({ ...selection, text }),
    },
    {
      text: textStyles.removeLink,
      visible: isLinkSelected,
      onPress: ({ selection }) => bodyEditorRef.current?.removeLink(selection.start, selection.end),
    },
  ];

  return (
    <>
      <EnrichedTextInput
        ref={bodyEditorRef}
        accessibilityLabel={strings.inputs.body}
        defaultValue={editorInitialBody}
        onChangeHtml={(event) => onChangeBody(unwrapEditorHtml(event.nativeEvent.value))}
        placeholder={strings.placeholders.emailBody}
        placeholderTextColor={getColor('text-gray-40')}
        contextMenuItems={contextMenuItems}
        onChangeState={(event) => setIsLinkSelected(event.nativeEvent.link.isActive)}
        htmlStyle={{
          ul: { bulletColor: textColor },
          ol: { markerColor: textColor },
          blockquote: { borderColor: getColor('border-gray-10'), color: textColor },
          a: { color: getColor('text-primary') },
        }}
        style={{ ...tailwind('px-4 py-3 text-base'), minHeight: BODY_EDITOR_MIN_HEIGHT, color: textColor }}
      />
      <BodyLinkModal isOpen={!!selectionToLink} onConfirm={addLink} onCancel={() => setSelectionToLink(null)} />
    </>
  );
};
