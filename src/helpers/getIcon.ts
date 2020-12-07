import { icons } from '../redux/constants'

export function getIcon(iconName: string | undefined): any {
    return icons[iconName ? iconName : 'search'];
}