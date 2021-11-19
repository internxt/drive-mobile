import React, { useState } from 'react';
import { View, Text, ViewProps, TouchableOpacity } from 'react-native';

interface SegmentedOption {
  text: string;
}

interface SegmentedControlProps extends ViewProps {
  tabs: SegmentedOption[];
  selectedIndex?: number;
  onChange?: (tabNumber: number) => void;
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element {
  const [selectedTab, setSelectedTab] = useState(props.selectedIndex || 0);

  return (
    <View>
      {props.tabs.map((tab, n) => {
        const isTabSelected = n === selectedTab;

        return (
          <View key={n}>
            <TouchableOpacity
              onPress={() => {
                setSelectedTab(n);
                props.onChange && props.onChange(n);
              }}
            >
              <View>
                <Text>{tab.text}</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}
