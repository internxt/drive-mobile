import React from 'react';

import { View } from 'react-native';
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
    'blue': colors['blue'].icon,
    'green': colors['green'].icon,
    'grey': colors['grey'].icon,
    'pink': colors['pink'].icon,
    'purple': colors['purple'].icon,
    'red': colors['red'].icon,
    'yellow': colors['yellow'].icon
}

// Icon class to use every svg icons without importing it
// and bringing possibility to pass attributes like color, size, etc
// - color (2 options)
//      1. default colors described in defaultColors array (blue, green...)
//      2. Hexadecimal colors (not every icon works with that) eg. #CCC #3482AD
// Usage:  import Icon from '../../assets/Icon'
//  <Icon name="folder" color="blue" height="75"/>

class Icon extends React.Component {
    constructor(props) {
        super(props);

        this.state = { name: props.name }
    }

    render() {
        switch (this.state.name) {
            // Folder cover icons
            case "avatarcircleneutral":
                return <AvatarCircleNeutral defaultColors={defaultColors}  {...this.props} />
            case "backup":
                return <Backup defaultColors={defaultColors} {...this.props} />;
            case "barchart":
                return <BarChart defaultColors={defaultColors} {...this.props} />;
            case "bell":
                return <Bell defaultColors={defaultColors} {...this.props} />;
            case "binoculars":
                return <Binoculars defaultColors={defaultColors} {...this.props} />;
            case "book":
                return <Book defaultColors={defaultColors} {...this.props} />;
            case "bowl":
                return <Bowl defaultColors={defaultColors} {...this.props} />;
            case "camera":
                return <Camera defaultColors={defaultColors} {...this.props} />;
            case "categories":
                return <Categories defaultColors={defaultColors} {...this.props} />;
            case "circlefilledcheckmark":
                return <CircleFilledCheckmark defaultColors={defaultColors} {...this.props} />;
            case "clappboard":
                return <Clappboard defaultColors={defaultColors} {...this.props} />;
            case "clipboard":
                return <Clipboard defaultColors={defaultColors} {...this.props} />;
            case "cloud":
                return <Cloud defaultColors={defaultColors} {...this.props} />;
            case "controllerneogeo":
                return <ControllerNeoGeo defaultColors={defaultColors} {...this.props} />;
            case "dollarsign":
                return <DollarSign defaultColors={defaultColors} {...this.props} />;
            case "facehappy":
                return <FaceHappy defaultColors={defaultColors} {...this.props} />;
            case "file":
                return <File defaultColors={defaultColors} {...this.props} />;
            case "heartfilled":
                return <HeartFilled defaultColors={defaultColors} {...this.props} />;
            case "inbox":
                return <Inbox defaultColors={defaultColors} {...this.props} />;
            case "lighton":
                return <LightOn defaultColors={defaultColors} {...this.props} />;
            case "locklocked":
                return <LockLocked defaultColors={defaultColors} {...this.props} />;
            case "musicnote":
                return <MusicNote defaultColors={defaultColors} {...this.props} />;
            case "navigationcircle":
                return <NavigationCircle defaultColors={defaultColors} {...this.props} />;
            case "notifications":
                return <Notifications defaultColors={defaultColors} {...this.props} />;
            case "path":
                return <Path defaultColors={defaultColors} {...this.props} />;
            case "running":
                return <Running defaultColors={defaultColors} {...this.props} />;
            case "starfilled":
                return <StarFilled defaultColors={defaultColors} {...this.props} />;
            case "video":
                return <Video defaultColors={defaultColors} {...this.props} />;
            case "window":
                return <Window defaultColors={defaultColors} {...this.props} />;
            case "yinyang":
                return <YinYang defaultColors={defaultColors} {...this.props} />;

            // UI icons
            case "checkmark":
                return <CheckMark defaultColors={defaultColors} {...this.props} />;
            case "details":
                return <Details defaultColors={defaultColors} {...this.props} />;
            default:
                console.error('Missing icon:', this.state.name);
                return <View></View>;
        }
    }
}

export default Icon;
