import { Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface TabsProps {
  value: string;
  tabs: { id: string; title: string; screen: JSX.Element }[];
  onTabChanged: (tabId: string) => void;
}

const Tabs = (props: TabsProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const headers = props.tabs.map((tab) => {
    const isActive = tab.id === props.value;

    return (
      <TouchableOpacity
        key={tab.id}
        activeOpacity={0.65}
        style={[tailwind('relative top-1 px-2 pb-1')]}
        onPress={() => props.onTabChanged(tab.id)}
      >
        <AppText
          style={[tailwind('text-lg'), { color: isActive ? getColor('text-gray-100') : getColor('text-gray-80') }]}
        >
          {tab.title}
        </AppText>

        <View style={[isActive && tailwind('mt-1 text-gray-100 border-b border-gray-100')]}></View>
      </TouchableOpacity>
    );
  });
  const currentTab = props.tabs.find((tab) => tab.id === props.value);

  return (
    <View style={tailwind('flex-1 mt-1')}>
      {/* HEADERS */}
      <View style={tailwind('px-3 flex-row border-b border-gray-10')}>{headers}</View>

      {/* CONTENT */}
      <View style={tailwind('flex-1')}>
        {currentTab ? currentTab.screen : <Text>Unknown tab with id "{props.value}"</Text>}
      </View>
    </View>
  );
};

export default Tabs;
