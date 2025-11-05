import { StyleSheet, Text, View, useColorScheme, Pressable } from 'react-native'
import React, { useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Login = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    
    const handleSubmit = () => {
        router.push('/')
        console.log('Log In:', email, password)
    }

    return (
        <ThemedView style = {styles.container} safe = {true}>
            <Pressable 
                onPress={() => router.back()}
                style={{
                    position: 'absolute',
                    top: 50,          // adjust for status bar / safe area
                    left: 20,
                    zIndex: 10,       // keep it above page content
                    padding: 8,
                }}
            >
                <Text style={{ fontSize: 40, color: theme.textPrimary }}>←</Text>
            </Pressable>

            
            <ThemedText style={styles.title}>Login to Your Account</ThemedText>
            <Spacer />
            <Spacer />
            <ThemedTextInput
                placeholder="Email"
                keyboardType="email-address"
                onChangeText={setEmail}
                value={email}
            />
            <ThemedTextInput
                placeholder="Password"
                keyboardType="default"
                secureTextEntry
                onChangeText={setPassword}
                value={password}
            />
            <ThemedButton style={{
                position: 'absolute',
                top: '61.8%',
            }} 
            onPress={handleSubmit}>
                    <ThemedText style = {styles.buttonText}>Continue {'-->'}</ThemedText>
            </ThemedButton>
        </ThemedView>
    )
}

export default Login

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        // justifyContent: 'center',
    },
    title: {
        fontFamily: 'inter',
        fontWeight: 'bold',
        fontSize: 24,
        paddingTop: '35%'
    },
    buttonText: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: 'bold',
        fontSize: 20
    },
    textSecondary: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: '600',
        fontSize: 14,
        width: '65%',
        textAlign: 'center'
    },
})