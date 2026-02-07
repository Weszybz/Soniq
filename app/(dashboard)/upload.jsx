import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, ActivityIndicator, Alert } from 'react-native'
import { Colors } from '../../constants/Colors';
import React, { useState } from 'react'
import { pickAndUploadSnippet } from '../../lib/snippets';
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '../../hooks/useUser';
import { useProfile } from '../../contexts/ProfileContext';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Upload = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const { user } = useUser()
  const { profileImage } = useProfile()

  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploadUrl, setLastUploadUrl] = useState(null)
  const [genre, setGenre] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [genreTouched, setGenreTouched] = useState(false)

  const titleError = titleTouched && !title.trim() ? 'Title is required' : null
  const genreError = genreTouched && !genre.trim() ? 'Genre is required' : null
  const isFormValid = title.trim() && genre.trim()

  const handleUpload = async () => {
    setTitleTouched(true)
    setGenreTouched(true)
    
    if (!isFormValid) return

    try {
      setIsUploading(true)
      setLastUploadUrl(null)

      const result = await pickAndUploadSnippet({ 
        title: title.trim(),
        genre: genre.trim(),
        username: user.prefs?.username || user.name || 'Anonymous',
        profileImage: profileImage || null
      })
      if (!result) return // user cancelled

      setLastUploadUrl(result.fileUrl)
      Alert.alert('Uploaded!', 'Your snippet has been uploaded successfully.')
      setTitle('')
      setGenre('')
      setTitleTouched(false)
      setGenreTouched(false)
    } catch (e) {
      console.warn(e)
      Alert.alert('Upload failed', e?.message || 'Something went wrong while uploading.')
    } finally {
      setIsUploading(false)
    }
  }
 
  return (
    <ThemedView style={styles.container} safe={true}>
            <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.textPrimary }]}>Upload snippet</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>Pick an audio file (MP3/WAV/M4A) and upload it.</ThemedText>
      </View>

      <Spacer height={16} />

      <View style={styles.card}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Title</ThemedText>
        <ThemedTextInput
          value={title}
          onChangeText={setTitle}
          onBlur={() => setTitleTouched(true)}
          placeholder='e.g. Hook idea / Chorus take'
          placeholderTextColor={theme.textSecondary + '80'}
          style={[
            styles.input, 
            { 
              borderColor: titleError ? '#ef4444' : theme.textSecondary + '40', 
              color: theme.textPrimary 
            }
          ]}
        />
        {titleError && (
          <ThemedText style={[styles.errorText, {color: theme.textSecondary }]}>{titleError}</ThemedText>
        )}

        <Spacer height={16} />

        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Genre</ThemedText>
        <ThemedTextInput
          value={genre}
          onChangeText={setGenre}
          onBlur={() => setGenreTouched(true)}
          placeholder='e.g. Hip-Hop, R&B, Pop'
          placeholderTextColor={theme.textSecondary + '80'}
          style={[
            styles.input, 
            { 
              borderColor: genreError ? '#ef4444' : theme.textSecondary + '40', 
              color: theme.textPrimary 
            }
          ]}
        />
        {genreError && (
          <ThemedText style={[styles.errorText, {color: theme.textSecondary }]}>{titleError}</ThemedText>
        )}

        <Spacer height={16} />

        <Pressable
          style={[styles.uploadBtn, { backgroundColor: theme.cardBackground || theme.background }, (!isFormValid || isUploading) && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={!isFormValid || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator />
          ) : (
            <Ionicons name='cloud-upload-outline' size={22} color={theme.textPrimary} />
          )}
          <ThemedText style={[styles.uploadText, { color: theme.textPrimary }]}>Pick & Upload</ThemedText>
        </Pressable>

        {lastUploadUrl ? (
          <>
            <Spacer height={12} />
            <ThemedText style={[styles.success, { color: theme.textSecondary }]}>Last upload:</ThemedText>
            <ThemedText style={[styles.url, { color: theme.textSecondary }]} numberOfLines={2}>
              {lastUploadUrl}
            </ThemedText>
          </>
        ) : null}
      </View>

      <Spacer height={24} />

      <ThemedText style={[styles.note, { color: theme.textSecondary }]}>Note: uploads are saved to Appwrite Storage and indexed in the snippets collection.</ThemedText>
    </ThemedView>
  )
}

export default Upload

const styles = StyleSheet.create({
  container: {
      flex: 1,
      //alignItems: 'center',
      // justifyContent: 'center',
      paddingHorizontal: 16,
  },
  header: {
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 18,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00000010',
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00000010',
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  success: {
    fontSize: 12,
  },
  url: {
    fontSize: 12,
    marginTop: 4,
  },
  note: {
    fontSize: 12,
    lineHeight: 16,
  },
})