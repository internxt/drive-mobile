import React, { SetStateAction } from "react";
import { KeyboardAvoidingView, Text, TextInput, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { IRegisterScreenStyles } from ".";
import strings from "../../../assets/lang/strings";

interface RegisterStep1Props {
  styles: IRegisterScreenStyles
  firstName: string
  setFirstName: React.Dispatch<React.SetStateAction<string>>
  lastName: string
  setLastName: React.Dispatch<React.SetStateAction<string>>
  email: string
  setEmail: React.Dispatch<React.SetStateAction<string>>
  isValidFirstName: boolean
  isValidLastName: boolean 
  isValidEmail: boolean
  isvalidStep: boolean
  setRegisterStep: React.Dispatch<SetStateAction<number>>
  navigation: any
}

const RegisterStep1 = (props: RegisterStep1Props) => {
  const isValidStep = props.isValidFirstName && props.isValidLastName && props.isValidEmail

  return (
    <KeyboardAvoidingView behavior="padding" style={props.styles.container}>
      <View style={props.styles.containerCentered}>
        <View style={props.styles.containerHeader}>
          <View style={props.styles.flexRow}>
            <Text style={props.styles.title}>{strings.screens.register_screen.create_account_title}</Text>
          </View>

          <View style={props.styles.buttonWrapper}>
            <TouchableOpacity
              style={[props.styles.button, props.styles.buttonOff]}
              onPress={() => props.navigation.navigate('Login')}>
              <Text style={props.styles.buttonOffLabel}>{strings.components.buttons.sign_in}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[props.styles.button, props.styles.buttonOn]}>
              <Text style={props.styles.buttonOnLabel}>{strings.components.buttons.create}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={props.styles.showInputFieldsWrapper}>
          <View style={props.styles.inputWrapper}>
            <TextInput
              style={[props.styles.input, !props.isValidFirstName ? {} : {}]}
              value={props.firstName}
              onChangeText={value => props.setFirstName(value)}
              placeholder={strings.components.inputs.first_name}
              placeholderTextColor="#666"
              maxLength={64}
              autoCapitalize='words'
              autoCompleteType='off'
              autoCorrect={false}
            />
          </View>

          <View style={props.styles.inputWrapper}>
            <TextInput
              style={[props.styles.input, !props.isValidLastName ? {} : {}]}
              value={props.lastName}
              onChangeText={value => props.setLastName(value)}
              placeholder={strings.components.inputs.last_name}
              placeholderTextColor="#666"
              maxLength={64}
              autoCapitalize='words'
              autoCompleteType='off'
              autoCorrect={false}
            />
          </View>

          <View style={props.styles.inputWrapper}>
            <TextInput
              style={[props.styles.input, props.isValidEmail ? {} : {}]}
              value={props.email}
              onChangeText={value => props.setEmail(value)}
              placeholder={strings.components.inputs.email}
              placeholderTextColor="#666"
              maxLength={64}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCompleteType="off"
              autoCorrect={false}
              textContentType="emailAddress"
            />
          </View>
        </View>

        <View style={props.styles.buttonFooterWrapper}>
          <TouchableOpacity
            style={[props.styles.button, props.styles.buttonBlock, isValidStep ? {} : props.styles.buttonDisabled]}
            disabled={!isValidStep}
            onPress={() => props.setRegisterStep(2)}
          >
            <Text style={props.styles.buttonOnLabel}>{strings.components.buttons.continue}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default RegisterStep1