import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { tailwind } from '../../helpers/designSystem';

interface TabsProps {
  value: string;
  tabs: { id: string; title: string; screen: JSX.Element }[];
  onTabChanged: (tabId: string) => void;
}

const Tabs = (props: TabsProps) => {
  const headers = props.tabs.map((tab, index) => {
    const isTheLast = index === props.tabs.length - 1;
    const isActive = tab.id === props.value;

    return (
      <TouchableOpacity
        style={[
          tailwind('pb-1'),
          !isTheLast && tailwind('mr-4'),
          isActive && tailwind('border-b border-neutral-500 text-neutral-500'),
        ]}
        onPress={() => props.onTabChanged(tab.id)}
      >
        <Text style={[tailwind('text-base'), isActive ? tailwind('text-neutral-500') : tailwind('text-neutral-100')]}>
          {tab.title}
        </Text>
      </TouchableOpacity>
    );
  });
  const currentTab = props.tabs.find((tab) => tab.id === props.value);

  return (
    <View style={tailwind('flex-1 mt-4')}>
      {/* HEADERS */}
      <View style={tailwind('px-5 flex-row border-b border-neutral-20')}>{headers}</View>

      {/* CONTENT */}
      <View style={tailwind('flex-1')}>
        {currentTab ? currentTab.screen : <Text>Unknown tab with id "{props.value}"</Text>}
      </View>
    </View>
  );
};

export default Tabs;
