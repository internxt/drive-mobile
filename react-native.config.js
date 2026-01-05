module.exports = {
    dependencies: {
        'react-native-pdf-thumbnail': {
            platforms: {
                android: {
                    sourceDir: '../node_modules/react-native-pdf-thumbnail/android/',
                    packageImportPath: 'import org.songsterq.pdfthumbnail.PdfThumbnailPackage;',
                },
            },
        },
    },
};