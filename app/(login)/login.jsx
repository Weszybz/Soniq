import { StyleSheet, Text, View, useColorScheme, Pressable, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { Colors } from '../../constants/Colors';
import { Link, useRouter } from 'expo-router';
import { useUser } from '../../hooks/useUser';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import ThemedLoader from '../../components/ThemedLoader';

const Login = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    
    const { user, login } = useUser()
    
    const handleSubmit = async () => {
        setError(null)
        try {
            await login(email, password)
            console.log('Current user is:', user)
            router.push('/profile')
        } catch (error) {
            setError(error.message)
        }
        // console.log('Current User:', user)
        console.log('Log In:', email, password)
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ThemedView style = {styles.container} safe = {true}>
                <Pressable 
                    onPress={() => router.push("/")}
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
                <View style={{
                    position: 'absolute',
                    top: '53.4%',
                    alignItems: 'center',
                }}>
                    <ThemedButton onPress={handleSubmit}>
                        <ThemedText style = {styles.buttonText}>Log in</ThemedText>
                    </ThemedButton>

                    <View style={{ flexDirection: 'row' }}>
                        <ThemedText>Don't have an account? {''}</ThemedText>
                        <Link href="/email" style={[styles.link, {color: theme.textPrimary}]}>Sign Up</Link>
                    </View>

                    <Spacer />
 
                    {error && <Text style={styles.error}>{error}</Text>}
                </View>
            </ThemedView>
        </TouchableWithoutFeedback>
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
    link: {
      fontFamily: 'inter',
      fontStyle: 'normal',
      fontWeight: '500',
      fontSize: 18
    },
    error: {
        color: Colors.warning,
        padding: 10,
        backgroundColor: '#f5c1c8',
        borderColor: Colors.warning,
        borderWidth: 1,
        borderRadius: 6,
        marginHorizontal: 10,
    },
})