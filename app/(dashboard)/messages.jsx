import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, Button } from 'react-native'
import { Colors } from '../../constants/Colors';
import { Audio } from 'expo-av';
import { useState, useEffect } from 'react';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Messages = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const [sound, setSound] = useState(null);
  const [status, setStatus] = useState(null);

  async function loadAndPlay() {
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://fra.cloud.appwrite.io/v1/storage/buckets/690d1d0b00220b4ab292/files/691e1114000cee48b6d5/view?project=690cb4cd003868dbbe00&mode=admin' },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );

    setSound(sound);
  }

  function onPlaybackStatusUpdate(playbackStatus) {
    if (!playbackStatus.isLoaded) return;
    setStatus(playbackStatus);
  }

  async function pause() {
    if (sound) {
      await sound.pauseAsync();
    }
  }

  async function play() {
    if (sound) {
      await sound.playAsync();
    } else {
      await loadAndPlay();
    }
  }

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);


  return (
    <ThemedView style={styles.container} safe={true}>
      <Text>Messages</Text>

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 20, marginBottom: 10 }}>Expo Go Music Player</Text>

        <Button title="Play" onPress={play} />
        <View style={{ height: 10 }} />
        <Button title="Pause" onPress={pause} />

        {status && (
          <Text style={{ marginTop: 20 }}>
            {status.isPlaying ? 'Playing...' : 'Paused'}
          </Text>
        )}
      </View>
    </ThemedView>
  )
}

export default Messages

const styles = StyleSheet.create({
  container: {
        flex: 1,
        alignItems: 'center',
        // justifyContent: 'center',
    },
})