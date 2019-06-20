import React from 'react';

// Folder cover icons
import AvatarCircleNeutral from './Folder-cover-icons/AvatarCircleNeutral';
import Backup from './Folder-cover-icons/Backup';
import BarChart from './Folder-cover-icons/BarChart';
import Bell from './Folder-cover-icons/Bell';
import Binoculars from './Folder-cover-icons/Binoculars';
import Book from './Folder-cover-icons/Book';
import Bowl from './Folder-cover-icons/Bowl';
import Camera from './Folder-cover-icons/Camera';
import Categories from './Folder-cover-icons/Categories';
import CircleFilledCheckmark from './Folder-cover-icons/CircleFilledCheckmark';
import Clappboard from './Folder-cover-icons/Clappboard';
import Clipboard from './Folder-cover-icons/Clipboard';
import Cloud from './Folder-cover-icons/Cloud';
import ControllerNeoGeo from './Folder-cover-icons/ControllerNeoGeo';
import DollarSign from './Folder-cover-icons/DollarSign';
import FaceHappy from './Folder-cover-icons/FaceHappy';
import File from './Folder-cover-icons/File';
import HeartFilled from './Folder-cover-icons/HeartFilled';
import Inbox from './Folder-cover-icons/Inbox';
import LightOn from './Folder-cover-icons/LightOn';
import LockLocked from './Folder-cover-icons/LockLocked';
import MusicNote from './Folder-cover-icons/MusicNote';
import NavigationCircle from './Folder-cover-icons/NavigationCircle';
import Notifications from './Folder-cover-icons/Notifications';
import Path from './Folder-cover-icons/Path';
import Running from './Folder-cover-icons/Running';
import StarFilled from './Folder-cover-icons/StarFilled';
import Video from './Folder-cover-icons/Video';
import Window from './Folder-cover-icons/Window';
import YinYang from './Folder-cover-icons/YinYang';

// UI Icons
import CheckMark from './userInterface/checkmark';
import Details from './userInterface/details';

import { colors } from '../../src/constants/color.constants';

const defaultColors = {
    'blue'      :   colors['blue'].icon,
    'green'     :   colors['green'].icon,
    'grey'      :   colors['grey'].icon,
    'pink'      :   colors['pink'].icon,
    'purple'    :   colors['purple'].icon,
    'red'       :   colors['red'].icon,
    'yellow'    :   colors['yellow'].icon
}

// Icon class to use every svg icons without importing it
// and bringing possibility to pass attributes like color, size, etc
// - color (2 options)
//      1. default colors described in defaultColors array (blue, green...)
//      2. Hexadecimal colors (not every icon works with that) eg. #CCC #3482AD
// Usage:  import Icon from '../../assets/Icon'
//  <Icon name="folder" color="blue" height="75"/>

const Icon = props => {
    switch (props.name.toLowerCase()) {
        // Folder cover icons
        case "avatarcircleneutral":
            return <AvatarCircleNeutral defaultColors={defaultColors}  {...props} />
        case "backup":
            return <Backup defaultColors={defaultColors} {...props} />;
        case "barchart":
            return <BarChart defaultColors={defaultColors} {...props} />;
        case "bell":
            return <Bell defaultColors={defaultColors} {...props} />;
        case "binoculars":
            return <Binoculars defaultColors={defaultColors} {...props} />;
        case "book":
            return <Book defaultColors={defaultColors} {...props} />;
        case "bowl":
            return <Bowl defaultColors={defaultColors} {...props} />;
        case "camera":
            return <Camera defaultColors={defaultColors} {...props} />;
        case "categories":
            return <Categories defaultColors={defaultColors} {...props} />;
        case "circlefilledcheckmark":
            return <CircleFilledCheckmark defaultColors={defaultColors} {...props} />;
        case "clappboard":
            return <Clappboard defaultColors={defaultColors} {...props} />;
        case "clipboard":
            return <Clipboard defaultColors={defaultColors} {...props} />;
        case "cloud":
            return <Cloud defaultColors={defaultColors} {...props} />;
        case "controllerneogeo":
            return <ControllerNeoGeo defaultColors={defaultColors} {...props} />;
        case "dollarsign":
            return <DollarSign defaultColors={defaultColors} {...props} />;
        case "facehappy":
            return <FaceHappy defaultColors={defaultColors} {...props} />;
        case "file":
            return <File defaultColors={defaultColors} {...props} />;
        case "heartfilled":
            return <HeartFilled defaultColors={defaultColors} {...props} />;
        case "inbox":
            return <Inbox defaultColors={defaultColors} {...props} />;
        case "lighton":
            return <LightOn defaultColors={defaultColors} {...props} />;
        case "locklocked":
            return <LockLocked defaultColors={defaultColors} {...props} />;
        case "musicnote":
            return <MusicNote defaultColors={defaultColors} {...props} />;
        case "navigationcircle":
            return <NavigationCircle defaultColors={defaultColors} {...props} />;
        case "notifications":
            return <Notifications defaultColors={defaultColors} {...props} />;
        case "path":
            return <Path defaultColors={defaultColors} {...props} />;
        case "running":
            return <Running defaultColors={defaultColors} {...props} />;
        case "starfilled":
            return <StarFilled defaultColors={defaultColors} {...props} />;
        case "video":
            return <Video defaultColors={defaultColors} {...props} />;
        case "window":
            return <Window defaultColors={defaultColors} {...props} />;
        case "yinyang":
            return <YinYang defaultColors={defaultColors} {...props} />;
        // UI icons
        case "checkmark":
            return <CheckMark defaultColors={defaultColors} {...props} />;
        case "details":
            return <Details defaultColors={defaultColors} {...props} />;
        default:
            return;
    }
};

export default Icon;
