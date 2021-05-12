import React, { SetStateAction, useState } from "react";
import { Alert, KeyboardAvoidingView, Text, TextInput, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { IRegisterScreenStyles } from ".";
import strings from "../../../assets/lang/strings";
import analytics from "../../helpers/lytics";
import { userActions } from "../../redux/actions";
import { apiLogin } from "../Login/access";
import { doRegister } from "./registerUtils";

interface RegisterStep3Props {
  styles: IRegisterScreenStyles
  firstName: string
  lastName: string
  email: string
  password: string
  setPassword: React.Dispatch<SetStateAction<string>>
  confirmPassword: string
  setConfirmPassword: React.Dispatch<SetStateAction<string>>
  isStrongPassword: (pwd: string) => boolean
  isValidPassword: boolean
  isValidStep: boolean
  setRegisterStep: React.Dispatch<SetStateAction<number>>
  navigation: any
  dispatch: any
}

const RegisterStep3 = (props: RegisterStep3Props) => {
  const [registerButtonClicked, setRegisterButtonClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const twoFactorCode = ''

  const handleOnPress = async () => {
    if (!props.isValidPassword) return Alert.alert('', 'Please make sure your password contains at least six characters, a number, and a letter')
    if (props.password !== props.confirmPassword) return Alert.alert('', 'Please make sure your passwords match')
    if (registerButtonClicked || isLoading) return

    setRegisterButtonClicked(true)
    setIsLoading(true)

    try {
      const userData = await doRegister({ firstName: props.firstName, lastName: props.lastName, email: props.email, password: props.password })
      await Promise.all([
        analytics.identify(userData.uuid, { email: props.email }),
        analytics.track('user-signup', {
          properties: {
            userId: userData.uuid,
            email: props.email,
            platform: 'mobile'
          }
        })
      ])

      const userLoginData = await apiLogin(props.email)
      await props.dispatch(userActions.signin(props.email, props.password, userLoginData.sKey, twoFactorCode))

    } catch (err) {
      await analytics.track('user-signin-attempted', {
        status: 'error',
        message: err.message
      })
      setIsLoading(false)
      setRegisterButtonClicked(false)

      Alert.alert('Error while registering', err.message)
    }
  }

  return (
    <KeyboardAvoidingView behavior='height' style={props.styles.container}>
      <View style={[props.styles.containerCentered, isLoading ? props.styles.halfOpacity : {}]}>
        <View style={props.styles.containerHeader}>
          <View style={props.styles.flexRow}>
            <Text style={props.styles.title}>{strings.screens.register_screen.create_account_title}</Text>
          </View>
        </View>

        <View style={[props.styles.showInputFieldsWrapper, { marginTop: -10 }]}>
          <View style={props.styles.inputWrapper}>
            <TextInput
              style={[props.styles.input, !props.isValidPassword ? {} : {}]}
              value={props.password}
              onChangeText={value => props.setPassword(value)}
              placeholder={strings.components.inputs.password}
              placeholderTextColor="#666"
              textContentType="password"
              autoCapitalize="none"
              autoCompleteType="password"
              autoCorrect={false}
              secureTextEntry={true}
            />
          </View>

          <View style={props.styles.inputWrapper}>
            <TextInput
              style={[props.styles.input, !props.isValidStep ? {} : {}]}
              value={props.confirmPassword}
              onChangeText={value => props.setConfirmPassword(value)}
              placeholder={strings.components.inputs.confirm_password}
              placeholderTextColor="#666"
              secureTextEntry={true}
              textContentType="password"
            />
          </View>
        </View>

        <View style={props.styles.buttonFooterWrapper}>
          <View style={props.styles.buttonWrapper}>
            <TouchableOpacity
              style={[props.styles.button, props.styles.buttonOff, props.styles.buttonLeft]}
              onPress={() => props.setRegisterStep(2)}
              disabled={registerButtonClicked}
            >
              <Text style={props.styles.buttonOffLabel}>{strings.components.buttons.back}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[props.styles.button, props.styles.buttonOn, props.styles.buttonRight]}
              onPress={() => handleOnPress()}
              disabled={registerButtonClicked}
            >
              <Text style={props.styles.buttonOnLabel}>{registerButtonClicked ? strings.components.buttons.creating_button : strings.components.buttons.continue}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default RegisterStep3