import Svg, { G, Path } from 'react-native-svg';
import useGetColor from 'src/hooks/useColor';

interface LockBadgeIconProps {
  size: number;
}

const LOCK_PATH =
  'M17.4219 2.51074C19.5226 2.61506 21.5164 3.49492 23.0107 4.98926C24.6048 6.58332 25.5 8.74566 25.5 11V11.5H27C28.1189 11.5 29.195 11.9166 30.0205 12.6641L30.1816 12.8184L30.3359 12.9795C31.0834 13.805 31.5 14.8811 31.5 16V30C31.5 31.1935 31.0256 32.3377 30.1816 33.1816C29.3377 34.0256 28.1935 34.5 27 34.5H7C5.80652 34.5 4.66227 34.0256 3.81836 33.1816C2.97445 32.3377 2.5 31.1935 2.5 30V16L2.50586 15.7773C2.56093 14.6649 3.02708 13.6096 3.81836 12.8184L3.97949 12.6641C4.80498 11.9166 5.88108 11.5 7 11.5H8.5V11C8.5 8.74566 9.3952 6.58332 10.9893 4.98926C12.5833 3.3952 14.7457 2.5 17 2.5L17.4219 2.51074ZM16.8516 9.50781C16.5083 9.54195 16.1855 9.69337 15.9395 9.93945C15.6581 10.2208 15.5 10.6022 15.5 11V11.5H18.5V11L18.4922 10.8516C18.458 10.5083 18.3066 10.1855 18.0605 9.93945C17.7792 9.65815 17.3978 9.5 17 9.5L16.8516 9.50781Z';

const LockBadgeIcon = ({ size }: LockBadgeIconProps): JSX.Element => {
  const getColor = useGetColor();

  return (
    <Svg width={size} height={size * (37 / 34)} viewBox="0 0 34 37" fill="none">
      <G>
        <Path
          d={LOCK_PATH}
          fill={getColor('text-gray-60')}
          stroke={getColor('bg-surface')}
          strokeWidth={5}
        />
      </G>
    </Svg>
  );
};

export default LockBadgeIcon;
