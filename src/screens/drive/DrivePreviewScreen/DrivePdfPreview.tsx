import { useStableCallback } from '@internxt-mobile/hooks/common';
import React, { memo, useMemo, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from 'src/components/AppText';

export interface DrivePdfPreviewProps {
  source: string;
  width: number;
  height: number;
  onTap: () => void;
  style: ViewStyle;
  topbarVisible: boolean;
  onScaleChanged: (scale: number) => void;
}

interface PdfDocumentProps {
  source: string;
  width: number;
  height: number;
  onTap: () => void;
  onScaleChanged: (scale: number) => void;
  onPageChanged: (page: number, numberOfPages: number) => void;
}

// On Android, react-native-pdf reloads the document whenever a prop changes identity: keep every prop stable.
const PdfDocument = memo(({ source, width, height, onTap, onScaleChanged, onPageChanged }: PdfDocumentProps) => {
  const pdfSource = useMemo(() => ({ uri: source }), [source]);
  const pdfStyle = useMemo(() => ({ height, width, backgroundColor: '#fff' }), [height, width]);

  return (
    <Pdf
      source={pdfSource}
      onPageSingleTap={onTap}
      onScaleChanged={onScaleChanged}
      onPageChanged={onPageChanged}
      style={pdfStyle}
    />
  );
});

export const DrivePdfPreview: React.FC<DrivePdfPreviewProps> = (props) => {
  const insets = useSafeAreaInsets();
  const [pages, setPages] = useState<{ currentPage: number; totalPages: number }>();
  const handleTap = useStableCallback(() => props.onTap());
  const handleScaleChanged = useStableCallback((scale: number) => props.onScaleChanged(scale));
  const handlePageChanged = useStableCallback((page: number, numberOfPages: number) => {
    setPages({ currentPage: page, totalPages: numberOfPages });
  });

  return (
    <View className="flex-1">
      {pages ? (
        <View
          className="absolute rounded-full px-4 py-2 right-2.5  top-2.5 z-10"
          style={{ backgroundColor: 'rgba(44, 44, 48, 0.75)', marginTop: props.topbarVisible ? 0 : insets.top }}
        >
          <AppText className="text-white">
            {pages.currentPage} of {pages.totalPages}
          </AppText>
        </View>
      ) : null}
      <PdfDocument
        source={props.source}
        width={props.width}
        height={props.height}
        onTap={handleTap}
        onScaleChanged={handleScaleChanged}
        onPageChanged={handlePageChanged}
      />
    </View>
  );
};
