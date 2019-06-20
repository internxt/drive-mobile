import React from 'react';
import { Svg } from 'expo';
const { Path } = Svg;

const SVG = ({
    defaultColors = {},
    color = '#b8b8b8',
    width = 20,
    height = 20
}) => {
    // Use default colors if none hex color is set
    color = color.startsWith('#') ? color : defaultColors[color];
    return (
    <Svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
        <Path fill={color} transform="rotate(-90 10.000000000000002,10) " d="m10,12a2,2 0 1 1 0,-4a2,2 0 0 1 0,4zm0,-6a2,2 0 1 1 0,-4a2,2 0 0 1 0,4zm0,12a2,2 0 1 1 0,-4a2,2 0 0 1 0,4z"/>
    </Svg>
)};

export default SVG;