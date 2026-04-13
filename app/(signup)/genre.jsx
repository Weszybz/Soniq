import { StyleSheet, Text, View, useColorScheme, Pressable, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useUser } from '../../hooks/useUser';
import { useProfile } from '../../contexts/ProfileContext';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';

const GENRES = [
    'Lofi', 'HipHop', 'R&B', 'Trap', 'Pop', 'EDM',
    'Rock', 'Jazz', 'Indie', 'Soul', 'House', 'Techno',
    'Drum & Bass', 'Afrobeats', 'Reggaeton',
]

const MAX_GENRES = 3

const OnboardingGenres = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()
    const { profileImage } = useProfile()
    const { registerImage } = useUser()

    const [selectedGenres, setSelectedGenres] = useState([])
    const [error, setError] = useState(null)
    const [toastVisible, setToastVisible] = useState(false)

    const showToast = () => {
        setToastVisible(true)
        setTimeout(() => setToastVisible(false), 2500)
    }

    const toggleGenre = (genre) => {
        if (selectedGenres.includes(genre)) {
            setSelectedGenres(prev => prev.filter(g => g !== genre))
        } else {
            if (selectedGenres.length >= MAX_GENRES) {
                showToast()
                return
            }
            setSelectedGenres(prev => [...prev, genre])
        }
    }

    const completeRegistration = async (genres) => {
        try {
            await registerImage(profileImage, genres)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleContinue = () => completeRegistration(selectedGenres)
    const handleSkip = () => completeRegistration([])

    return (
        <ThemedView style={styles.container} safe={true}>
            <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
            >
                <Text style={{ fontSize: 40, color: theme.textPrimary }}>←</Text>
            </Pressable>

            <Pressable
                onPress={handleSkip}
                style={styles.skipButton}
            >
                <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
            </Pressable>

            <ThemedText style={styles.title}>Pick your genres</ThemedText>

            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Select up to 3 genres
            </Text>

            <ScrollView
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContainer}
                showsVerticalScrollIndicator={false}
            >
                {GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre)
                    return (
                        <Pressable
                            key={genre}
                            onPress={() => toggleGenre(genre)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: isSelected
                                        ? Colors.primary
                                        : theme.uiBackground,
                                    borderColor: isSelected
                                        ? Colors.primary
                                        : theme.divider,
                                },
                            ]}
                        >
                            <Text style={[
                                styles.chipText,
                                { color: isSelected ? '#fff' : theme.textPrimary },
                            ]}>
                                {genre}
                            </Text>
                        </Pressable>
                    )
                })}
            </ScrollView>

            {toastVisible && (
                <View style={[styles.toast, { backgroundColor: theme.uiBackground, borderColor: theme.divider }]}>
                    <Text style={[styles.toastText, { color: theme.textPrimary }]}>
                        You can only select up to {MAX_GENRES} genres
                    </Text>
                </View>
            )}

            <ThemedButton
                disabled={selectedGenres.length === 0}
                style={[
                    styles.continueBtn,
                    { opacity: selectedGenres.length === 0 ? 0.4 : 1 },
                ]}
                onPress={handleContinue}
            >
                <ThemedText style={styles.buttonText}>Continue {'-->'}</ThemedText>
            </ThemedButton>

            {error && (
                <Text style={styles.error}>{error}</Text>
            )}
        </ThemedView>
    )
}

export default OnboardingGenres

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    skipButton: {
        position: 'absolute',
        top: 62,
        right: 24,
        zIndex: 10,
    },
    skipText: {
        fontFamily: 'inter',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontFamily: 'inter',
        fontWeight: 'bold',
        fontSize: 24,
        paddingTop: '20%',
        textAlign: 'center',
    },
    helperText: {
        fontFamily: 'inter',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 10,
        marginBottom: 6,
    },
    chipsScroll: {
        flex: 1,
        width: '100%',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 100,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        margin: 6,
    },
    chipText: {
        fontFamily: 'inter',
        fontSize: 14,
        fontWeight: '600',
    },
    toast: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        zIndex: 100,
    },
    toastText: {
        fontFamily: 'inter',
        fontSize: 13,
        fontWeight: '500',
    },
    continueBtn: {
        marginBottom: 28,
    },
    buttonText: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: 'bold',
        fontSize: 20,
    },
    error: {
        color: Colors.warning,
        padding: 10,
        backgroundColor: '#f5c1c8',
        borderColor: Colors.warning,
        borderWidth: 1,
        borderRadius: 6,
        marginHorizontal: 10,
        marginBottom: 12,
    },
})
