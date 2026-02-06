import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, ActivityIndicator, Alert } from 'react-native'
import { Colors } from '../../constants/Colors';
import React, { useState } from 'react'
import { pickAndUploadSnippet } from '../../lib/snippets';
import { Ionicons } from '@expo/vector-icons'

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Upload = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploadUrl, setLastUploadUrl] = useState(null)

  const handleUpload = async () => {
    try {
      setIsUploading(true)
      setLastUploadUrl(null)

      const result = await pickAndUploadSnippet({ titleOverride: title?.trim() || undefined })
      if (!result) return // user cancelled

      setLastUploadUrl(result.fileUrl)
      Alert.alert('Uploaded!', 'Your snippet has been uploaded successfully.')
      setTitle('')
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
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Title (optional)</ThemedText>
        <ThemedTextInput
          value={title}
          onChangeText={setTitle}
          placeholder='e.g. Hook idea / Chorus take'
          placeholderTextColor={theme.textSecondary + '80'}
          style={[styles.input, { borderColor: theme.textSecondary + '40', color: theme.textPrimary }]}
        />

        <Spacer height={16} />

        <Pressable
          style={[styles.uploadBtn, { backgroundColor: theme.cardBackground || theme.background }]}
          onPress={handleUpload}
          disabled={isUploading}
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
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
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