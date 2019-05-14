import React from 'react';
import { Svg } from 'expo';
const { Path } = Svg;

const SVG = ({
    defaultColors = {},
    color = 'blue',
    width = 36,
    height = 36,
}) => {
    // Use default colors if none hex color is set
    color = color.startsWith('#') ? color : defaultColors[color];
    return (
    <Svg xmlns="http://www.w3.org/2000/svg" 
        width={width}
        height={height} 
        viewBox="0 0 36 36">
    <Path 
        fill={color}
        fill-rule="evenodd" 
        d="M1008.21962,660 C1018.03945,660 1026,668.058875 1026,678 C1026,687.941125 1018.03945,696 1008.21962,696 C1005.68705,696 1001.78942,694.713091 1001.78942,694.713091 C1001.40733,694.59423 1001.29993,694.237035 1001.56103,693.900449 L1002.39801,692.82146 C1002.65396,692.491512 1003.18386,692.329727 1003.57114,692.451404 C1003.57114,692.451404 1006.50558,693.463671 1008.52605,693.463671 C1016.07977,693.463671 1022.20327,687.264536 1022.20327,679.617517 C1022.20327,671.970497 1016.07977,665.771363 1008.52605,665.771363 C1003.91778,665.771363 999.84181,668.078564 997.363775,671.614171 L1001.20188,673.857475 L990.593969,679.363278 L990,667.31018 L992.836296,668.967943 C995.91509,663.605414 1001.65145,660 1008.21962,660 L1008.21962,660 L1008.21962,660 Z M1007.66432,671.631617 L1007.11713,680.493344 C1007.11713,680.493344 1004.63412,682.612847 1003.31646,683.94678 C1003.31646,683.94678 1002.79064,684.677234 1003.3075,685.339318 C1003.82368,686.001401 1004.53833,685.754428 1004.53833,685.754428 C1006.28326,684.846767 1009.04124,683.046794 1010.10185,682.345642 C1010.37131,682.16704 1010.5243,681.855882 1010.50431,681.530073 L1009.89166,671.651152 C1009.89166,671.651152 1009.65735,670.919302 1008.75869,670.919302 C1007.86004,670.919302 1007.66432,671.631617 1007.66432,671.631617 L1007.66432,671.631617 L1007.66432,671.631617 L1007.66432,671.631617 Z" transform="translate(-990 -660)"/>
    </Svg>
)};

export default SVG;