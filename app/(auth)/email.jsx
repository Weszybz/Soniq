import { StyleSheet, Text, View, useColorScheme, Pressable } from 'react-native'
import React from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const email = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    
    const handleSubmit = () => {
        console.log('login form submitted')
    }

    const router = useRouter()

    return (
        <ThemedView style = {styles.container} safe = {true}>
            <Pressable 
                onPress={() => router.push('/')}
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

            
            <ThemedText style={styles.title}>What's your email?</ThemedText>
            <Spacer />
            <ThemedTextInput
                placeholder="Email Address"
                keyboardType="email-address"
            />

            <Spacer style={{height: 100}}/>

            <Text style={[styles.textSecondary, {color: theme.textSecondary}]}>
                By tapping Continue, you are agreeing to our{' '}
                <Text style={{fontWeight: 'bold'}}>Terms of Service</Text> and{' '}
                <Text style={{fontWeight: 'bold'}}>Privacy Policy</Text>
            </Text>
            <ThemedButton onPress={handleSubmit}>
                    <ThemedText style = {styles.buttonText}>Continue {'-->'}</ThemedText>
            </ThemedButton>
        </ThemedView>
    )
}

export default email

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