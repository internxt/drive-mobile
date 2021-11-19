import React from 'react';
import { View, Text, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { TapGestureHandler } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import tailwind, { getColor } from 'tailwind-rn';
import { Reducers } from '../../redux/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons';
import { LinearGradient } from 'expo-linear-gradient';

interface PreviewProps extends Reducers {
  route: {
    params: {
      uri: string;
    };
  };
}

function Preview(props: PreviewProps) {
  const previewUri = props.route.params.uri;

  return (
    <View style={tailwind('h-full')}>
      <TapGestureHandler numberOfTaps={1} enabled={true}>
        <Image
          resizeMode={'cover'}
          resizeMethod={'resize'}
          style={tailwind('w-full h-full absolute')}
          source={{ uri: previewUri }}
        />
      </TapGestureHandler>

      <SafeAreaView style={tailwind('flex-col justify-between h-full')}>
        <LinearGradient
          // Button Linear Gradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.24)', 'transparent']}
          style={tailwind('absolute w-full')}
        >
          <View style={tailwind('flex-row justify-between m-3')}>
            <TouchableOpacity
              style={tailwind('z-10')}
              onPress={() => {
                props.navigation.goBack();
              }}
            >
              <Unicons.UilAngleLeft color={getColor('white')} size={32} />
            </TouchableOpacity>
            <TouchableOpacity
              style={tailwind('z-10')}
              onPress={() => {
                props.navigation.goBack();
              }}
            >
              <Unicons.UilEllipsisH color={getColor('white')} size={32} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.6)']}
          style={tailwind('flex-row justify-around p-3 absolute bottom-0 w-full')}
        >
          <TouchableOpacity style={tailwind('items-center')}>
            <Unicons.UilLink color="white" size={26} />
            <Text style={tailwind('text-white text-xs')}>Share with link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tailwind('items-center')}>
            <Unicons.UilImport color="white" size={26} />
            <Text style={tailwind('text-white text-xs')}>Save to offline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tailwind('items-center')}>
            <Unicons.UilTrashAlt color="white" size={26} />
            <Text style={tailwind('text-white text-xs')}>Move to trash</Text>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const mapStateToProps = (state: Reducers) => {
  return { ...state };
};

export default connect(mapStateToProps)(Preview);
