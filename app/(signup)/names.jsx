import { StyleSheet, Text, View, useColorScheme, Pressable, TouchableWithoutFeedback, Keyboard } from 'react-native'
import React, { useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useUser } from '../../hooks/useUser';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Names = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [error, setError] = useState(null)

    const { user, registerName } = useUser()

    
    
    const handleSubmit = async () => {
        try {
            await registerName(firstName, lastName)
            router.push('/birthday')
            console.log('Name:', firstName, lastName)
        } catch (error) {
            setError(error.message)
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

                
                <ThemedText style={styles.title}>What's your name?</ThemedText>
                <Spacer />
                <ThemedTextInput
                    placeholder="First Name"
                    keyboardType="default"
                    onChangeText={setFirstName}
                    value={firstName}
                />
                <ThemedTextInput
                    placeholder="Last Name"
                    keyboardType="default"
                    onChangeText={setLastName}
                    value={lastName}
                />
                <ThemedButton style={{
                    position: 'absolute',
                    top: '54.3%',
                }} 
                onPress={handleSubmit}>
                        <ThemedText style = {styles.buttonText}>Continue {'-->'}</ThemedText>
                </ThemedButton>
                {error && <Text style={styles.error}>{error}</Text>}
            </ThemedView>
        </TouchableWithoutFeedback>
    )
}

export default Names

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