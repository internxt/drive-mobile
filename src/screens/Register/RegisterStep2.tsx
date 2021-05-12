import React, { SetStateAction } from "react";
import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { IRegisterScreenStyles } from ".";
import strings from "../../../assets/lang/strings";

interface RegisterStep2Props {
  styles: IRegisterScreenStyles
  setRegisterStep: React.Dispatch<SetStateAction<number>>
}

const RegisterStep2 = (props: RegisterStep2Props) => {
  return (
    <View style={props.styles.container}>
        <View style={props.styles.containerCentered}>
          <View style={props.styles.containerHeader}>
            <View style={props.styles.flexRow}>
              <Text style={props.styles.title}>{strings.screens.register_screen.security_title}</Text>
            </View>

            <View>
              <Text style={props.styles.textDisclaimer}>{strings.screens.register_screen.security_subtitle}</Text>
            </View>

            <View style={props.styles.textStorePasswordContainer}>
              <View style={[props.styles.flexRow, { marginBottom: 10 }]}>
                <Text>{'\u2022'}</Text>

                <Text style={props.styles.textStorePassword}>{strings.screens.register_screen.suggestion_1}</Text>
              </View>

              <View style={props.styles.flexRow}>
                <Text>{'\u2022'}</Text>

                <Text style={props.styles.textTip}>{strings.screens.register_screen.suggestion_2}</Text>
              </View>
            </View>

            <View style={[props.styles.buttonFooterWrapper, { marginTop: 42 }]}>
              <View style={props.styles.buttonWrapper}>
                <TouchableOpacity
                  style={[props.styles.button, props.styles.buttonOff, props.styles.buttonLeft]}
                  onPress={() => props.setRegisterStep(1)}
                >
                  <Text style={props.styles.buttonOffLabel}>{strings.components.buttons.back}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[props.styles.button, props.styles.buttonOn, props.styles.buttonRight]}
                  onPress={() => props.setRegisterStep(3)}
                >
                  <Text style={props.styles.buttonOnLabel}>{strings.components.buttons.continue}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
  );
}

export default RegisterStep2