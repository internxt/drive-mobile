import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';


class SVG extends React.Component {
    constructor(props) {
        super(props);

        const defaultColor = props.color ? props.color : 'blue';

        this.state = {
            color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
            width: props.width ? props.width : 39,
            height: props.height ? props.height : 36
        }
    }

    render() {
        return <View style={[StyleSheet.absoluteFill]}>
            <Svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 39 36"
                width={this.state.width}
                height={this.state.height}>
                <Path
                    fill={this.state.color}
                    d="M407.125749,243.393564 C411.934518,249.269802 419.593394,253.611386 422.498744,259 C426.873093,250.893564 442,245.158416 442,233.002475 C442,227.990099 437.108364,223 431.855128,223 C427.646513,223 424.035542,225.529703 422.498744,229.128713 C420.964458,225.529703 417.353487,223 413.144872,223 C407.891636,223 403,227.990099 403,233.002475 C403,236.490099 404.245509,239.44802 406.123817,242.086634 L407.125749,243.393564 Z"
                    transform="translate(-403 -223)"
                    fill-rule="evenodd"
                />
            </Svg>
        </View>;
    }
}

export default SVG;
