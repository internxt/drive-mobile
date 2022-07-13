import React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import { Photo } from '@internxt/sdk/dist/photos';
import { GalleryItemType } from '../../types/photos';
import { CheckCircle } from 'phosphor-react-native';
import FastImage from 'react-native-fast-image';
import { PhotosService } from '../../services/photos';

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  data: Photo;
  isSelected: boolean;
  resolvedPreview?: string;
  onPress?: (photo: Photo, preview: string | null) => void;
  onLongPress?: (photo: Photo, preview: string | null) => void;
}

type GalleryItemState = { photoPreview: string | null };
class GalleryItem extends React.PureComponent<GalleryItemProps, GalleryItemState> {
  public state: GalleryItemState = {
    photoPreview: null,
  };
  constructor(props: GalleryItemProps) {
    super(props);
  }

  async componentDidMount() {
    await this.loadPreview();
  }
  loadPreview = async () => {
    const preview = await PhotosService.instance.getPreview(this.props.data);

    this.setState({
      photoPreview: preview,
    });
  };
  render(): React.ReactNode {
    const { onPress, data, size, onLongPress, isSelected } = this.props;
    const { photoPreview } = this.state;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[tailwind('bg-white'), { width: size, height: size }]}
        onPress={() => onPress && onPress(data, photoPreview)}
        onLongPress={() => onLongPress && onLongPress(data, photoPreview)}
      >
        {photoPreview ? (
          <FastImage
            style={tailwind('w-full h-full')}
            source={{
              uri: photoPreview,
            }}
          />
        ) : null}

        {isSelected && (
          <View
            style={[
              tailwind('absolute bg-blue-60 w-5 h-5 bottom-3 right-3 flex justify-center items-center rounded-xl'),
            ]}
          >
            <CheckCircle color={getColor('white')} size={30} />
          </View>
        )}
      </TouchableOpacity>
    );
  }
}

export default GalleryItem;
