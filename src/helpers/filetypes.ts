import React from 'react';
import { SvgProps } from 'react-native-svg';

import audio from '../../assets/icons/file-types/audio.svg';
import code from '../../assets/icons/file-types/code.svg';
import defaultIcon from '../../assets/icons/file-types/default.svg';
import image from '../../assets/icons/file-types/image.svg';
import pdf from '../../assets/icons/file-types/pdf.svg';
import ppt from '../../assets/icons/file-types/ppt.svg';
import txt from '../../assets/icons/file-types/txt.svg';
import video from '../../assets/icons/file-types/video.svg';
import word from '../../assets/icons/file-types/word.svg';
import xls from '../../assets/icons/file-types/xls.svg';
import zip from '../../assets/icons/file-types/zip.svg';
import folder from '../../assets/icons/file-types/folder.svg';
import figma from '../../assets/icons/file-types/figma.svg';

export const extensions: Record<string, React.FC<SvgProps>> = {
  txt: txt,
  zip: zip,
  xls: xls,
  xlsx: xls,
  avi: video,
  mov: video,
  mp4: video,
  ppt: ppt,
  pptx: ppt,
  pdf: pdf,
  bmp: image,
  jpg: image,
  jpeg: image,
  gif: image,
  png: image,
  heic: image,
  svg: image,
  doc: word,
  docx: word,
  docm: word,
  js: code,
  ts: code,
  tsx: code,
  c: code,
  cpp: code,
  wav: audio,
  mp3: audio,
  fig: figma,
};

export function getFileTypeIcon(ext: string): React.FC<SvgProps> {
  const exists = ~Object.keys(extensions).indexOf(ext);

  if (exists) {
    return extensions[ext];
  }

  return defaultIcon;
}

export const FolderIcon = folder;
