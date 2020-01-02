import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';


class SVG extends React.Component {
    constructor(props) {
        super(props);

        const defaultColor = props.color ? props.color : 'blue';

        this.state = {
            color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
            width: props.width ? props.width : 38,
            height: props.height ? props.height : 35
        }
    }

    render() {
        return <View style={[StyleSheet.absoluteFill]}>
            <Svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 35 42"
                width={this.state.width}
                height={this.state.height}>
                <Path
                    fill={this.state.color}
                    d="M437.182557,4.72279242 C436.981318,3.77132044 436.050183,3 435.089403,3 L410.910597,3 C409.955819,3 409.021054,3.76010209 408.817443,4.72279242 L404,27.5 L404,36.25 C404,37.216 404.773818,38 405.727273,38 L440.272727,38 C441.229636,38 442,37.216 442,36.25 L442,27.5 L437.182557,4.72279242 L437.182557,4.72279242 L437.182557,4.72279242 L437.182557,4.72279242 Z M431.194182,27.5 C431.194182,29.0505 429.943636,30.3175 428.413273,30.3175 L417.590182,30.3175 C416.059818,30.3175 414.809273,29.0505 414.809273,27.5 L408.327111,27.5 C407.845206,27.5 407.533655,27.099249 407.622186,26.6507658 L411.432349,7.34923422 C411.524934,6.88021511 411.995727,6.5 412.465936,6.5 L433.534064,6.5 C434.012313,6.5 434.47912,6.90075099 434.567651,7.34923422 L438.377814,26.6507658 C438.470399,27.1197849 438.150218,27.5 437.673299,27.5 L431.194182,27.5 L431.194182,27.5 L431.194182,27.5 L431.194182,27.5 Z"
                    transform="translate(-404 -3)"
                    fill-rule="evenodd"
                />
            </Svg>
        </View>;
    }
}

export default SVG;
