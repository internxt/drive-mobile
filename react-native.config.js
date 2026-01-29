module.exports = {
  dependencies: {
    'react-native-pdf-thumbnail': {
      platforms: {
        android: {
          packageImportPath: 'import org.songsterq.pdfthumbnail.PdfThumbnailPackage;',
          packageInstance: 'new PdfThumbnailPackage()',
        },
      },
    },
  },
};
