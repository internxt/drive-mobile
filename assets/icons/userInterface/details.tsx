import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

function SVG(props: any): JSX.Element {
  const defaultColor = props.color ? props.color : '#b8b8b8';

  const options = {
    color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
    width: props.width ? props.width : 20,
    height: props.height ? props.height : 20
  }

  return <View>
    <Svg
      width={options.width}
      height={options.height}>
      <Path
        fill={options.color}
        d="m10,12a2,2 0 1 1 0,-4a2,2 0 0 1 0,4zm0,-6a2,2 0 1 1 0,-4a2,2 0 0 1 0,4zm0,12a2,2 0 1 1 0,-4a2,2 0 0 1 0,4z"
        transform="rotate(-90 10,10)"
        fill-rule="evenodd"
      />
    </Svg>
  </View>;
}

export default SVG;