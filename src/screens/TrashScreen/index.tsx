import strings from 'assets/lang/strings';
import { Trash } from 'phosphor-react-native';
import React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import AppScreen from 'src/components/AppScreen';
import AppScreenTitle from 'src/components/AppScreenTitle';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import { SettingsScreenProps } from '../../types/navigation';

function Index({ navigation }: SettingsScreenProps<'Trash'>): JSX.Element {
    const tailwind = useTailwind();
    const getColor = useGetColor();

    const onBackButtonPressed = () => navigation.goBack();

    return (
        <AppScreen safeAreaTop safeAreaColor={getColor('text-white')} style={tailwind(' bg-white flex-1')}>
            <AppScreenTitle
                text={strings.screens.TrashScreen.title}
                textStyle={tailwind('justify-center')}
                containerStyle={tailwind('bg-white border-b border-gray-10')}
                rightSlot={
                    <View style={{ left: 150, justifyContent: 'center', alignContent: 'center' }}>
                        <Trash />
                    </View>
                }
                centerText
                onBackButtonPressed={onBackButtonPressed}
            />
            <ScrollView>
            </ScrollView>
        </AppScreen>
    );
}

export default Index;
