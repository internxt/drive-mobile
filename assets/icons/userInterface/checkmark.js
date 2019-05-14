import React from 'react';
import { Svg } from 'expo';
const { Path } = Svg;

const SVG = ({
    defaultColors = {},
    color = '#FFF',
    width = 38,
    height = 38,
}) => {
    // Use default colors if none hex color is set
    color = color.startsWith('#') ? color : defaultColors[color];
    return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
        <Path fill={color} d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
    </Svg>
)};

export default SVG;