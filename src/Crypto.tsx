import { Kyber } from 'crystals-kyber';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

const KyberEncryptionApp = () => {
  const [message, setMessage] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');

  const performKyberEncryption = async () => {
    try {
      const keyPair = Kyber.generateKeyPair();

      const encryptionResult = Kyber.encrypt(keyPair.publicKey, Buffer.from(message, 'utf-8'));

      setEncryptedMessage(encryptionResult.ciphertext.toString('base64'));

      const decrypted = Kyber.decrypt(keyPair.privateKey, encryptionResult.ciphertext);

      setDecryptedMessage(decrypted.toString('utf-8'));
    } catch (error) {
      console.error('Encryption error:', error);

      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Post-Quantum Encryption</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter message to encrypt"
        value={message}
        onChangeText={setMessage}
      />

      <Button title="Encrypt & Decrypt" onPress={performKyberEncryption} />

      {encryptedMessage ? (
        <View style={styles.resultContainer}>
          <Text>Encrypted Message:</Text>
          <Text>{encryptedMessage}</Text>

          <Text>Decrypted Message:</Text>
          <Text>{decryptedMessage}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
  },
  resultContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});

export default KyberEncryptionApp;
