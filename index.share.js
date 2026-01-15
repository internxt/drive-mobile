// index.share.js (Raíz del proyecto)
import { AppRegistry } from 'react-native';
import ShareExtension from './ShareExtension';

// const ShareExtension = (props) => {
//   return (
//     <View style={{ flex: 1, backgroundColor: '#091e42', justifyContent: 'center', alignItems: 'center' }}>
//       <Text style={{ color: 'white', fontWeight: 'bold' }}>Internxt New Arch Active</Text>
//       <Text style={{ color: '#ccc', fontSize: 12, marginTop: 10 }}>
//         {props.initialProps?.images?.length || 0} archivos detectados
//       </Text>
//     </View>
//   );
// };

// Debe ser exactamente este nombre
AppRegistry.registerComponent('shareExtension', () => ShareExtension);
