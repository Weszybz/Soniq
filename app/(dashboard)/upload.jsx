import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { Colors } from '../../constants/Colors';
import React, { useState, useRef, useEffect } from 'react';
import { pickAndUploadSnippet } from '../../lib/snippets';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../hooks/useUser';
import { useProfile } from '../../contexts/ProfileContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { uploadSnippetAsset } from '../../lib/snippets'
import { getUserByUsername, searchUsersByUsername } from '../../lib/userService'

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const Upload = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  const isDark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()

  const navClearance = Math.max(112 - insets.bottom + 20, 32)

  const { user } = useUser()
  const { profileImage } = useProfile()

  const [selectedFile, setSelectedFile] = useState(null)

  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploadUrl, setLastUploadUrl] = useState(null)
  const [genre, setGenre] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [genreTouched, setGenreTouched] = useState(false)

  // Collaborator
  const [collaboratorQuery, setCollaboratorQuery] = useState('')
  const [collaboratorError, setCollaboratorError] = useState(null)
  const [resolvedCollaborator, setResolvedCollaborator] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputRowHeight, setInputRowHeight] = useState(0)

  const debounceTimer = useRef(null)
  const blurTimer = useRef(null)

  const titleError = titleTouched && !title.trim() ? 'Title is required' : null
  const genreError = genreTouched && !genre.trim() ? 'Genre is required' : null
  const isFormValid = !!selectedFile && !!title.trim() && !!genre.trim()

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      })
      if (res.canceled) return
      const asset = res.assets?.[0]
      if (!asset?.uri) return

      if ((asset.size ?? 0) > 25 * 1024 * 1024) {
        Alert.alert('File too large', 'Maximum file size is 25 MB. Try a shorter snippet.')
        return
      }

      setSelectedFile({
        uri: asset.uri,
        name: asset.name ?? `snippet-${Date.now()}.mp3`,
        mimeType: asset.mimeType ?? 'audio/mpeg',
        size: asset.size ?? 0,
      })
    } catch {
      Alert.alert('Error', 'Could not open file picker.')
    }
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    const query = collaboratorQuery.trim()

    if (!query) {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionsLoading(false)
      return
    }

    if (resolvedCollaborator && resolvedCollaborator.username === query) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSuggestionsLoading(true)
    setShowSuggestions(true)

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(query, 4)
        setSuggestions(results.filter(u => u.userId !== user?.$id).slice(0, 3))
      } catch {
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 280)

    return () => clearTimeout(debounceTimer.current)
  }, [collaboratorQuery])

  const handleCollaboratorChange = (text) => {
    setCollaboratorQuery(text)
    setCollaboratorError(null)
    if (resolvedCollaborator && text !== resolvedCollaborator.username) {
      setResolvedCollaborator(null)
    }
  }

  const handleSelectSuggestion = (suggestion) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setCollaboratorQuery(suggestion.username)
    setResolvedCollaborator(suggestion)
    setSuggestions([])
    setShowSuggestions(false)
    setCollaboratorError(null)
  }

  const handleCollaboratorBlur = () => {
    blurTimer.current = setTimeout(() => setShowSuggestions(false), 180)
  }

  const handleCollaboratorFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    const query = collaboratorQuery.trim()
    if (query && !resolvedCollaborator) setShowSuggestions(true)
  }

  const handleClearCollaborator = () => {
    setCollaboratorQuery('')
    setResolvedCollaborator(null)
    setSuggestions([])
    setShowSuggestions(false)
    setCollaboratorError(null)
  }

  const handleUpload = async () => {
    setTitleTouched(true)
    setGenreTouched(true)
    setCollaboratorError(null)
    
    if (!selectedFile) {
      Alert.alert('No file selected', 'Please select an audio file first.')
      return
    }
    if (!title.trim() || !genre.trim()) return

    let finalCollaborator = null
    const collaboratorInput = collaboratorQuery.trim()

    if (collaboratorInput) {
      if (resolvedCollaborator) {
        finalCollaborator = {
          userId: resolvedCollaborator.userId,
          username: resolvedCollaborator.username,
        }
      } else {
        const match = await getUserByUsername(collaboratorInput)
        if (!match) {
          setCollaboratorError('User not found')
          return
        }
        finalCollaborator = { userId: match.userId, username: match.username }
      }

      if (finalCollaborator.userId === user.$id) {
        setCollaboratorError('You cannot collaborate with yourself')
        return
      }
    }

    try {
      setIsUploading(true)
      setLastUploadUrl(null)

      await uploadSnippetAsset(selectedFile,  {
        title: title.trim(),
        genre: genre.trim(),
        username: user.prefs?.username || user.name || 'Anonymous',
        profileImage: profileImage || null,
        collaborator: finalCollaborator,
      })
      Alert.alert('Uploaded!', 'Your snippet has been uploaded successfully.')
      setSelectedFile(null)
      setTitle('')
      setGenre('')
      setCollaboratorQuery('')
      setResolvedCollaborator(null)
      setSuggestions([])
      setShowSuggestions(false)
      setCollaboratorError(null)
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
      >
        <View style={styles.header}>
          <ThemedText style={[styles.pageTitle, { color: theme.textPrimary }]}>
            Upload Snippet
          </ThemedText>
          <ThemedText style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
            Share your latest idea with the community
          </ThemedText>
        </View>

        <Pressable
          onPress={handlePickFile}
          style={({ pressed }) => [
            styles.pickerZone,
            {
              borderColor: selectedFile
                ? Colors.primary + '70'
                : theme.textSecondary + '40',
              backgroundColor: selectedFile
                ? Colors.primary + (isDark ? '18' : '0A')
                : theme.cardBackground,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          {selectedFile ? (
            <View style={styles.pickerSelected}>
              <View style={[styles.fileIconBadge, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name='musical-note' size={24} color={Colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <ThemedText
                  style={[styles.fileName, { color: theme.textPrimary }]}
                  numberOfLines={1}
                >
                  {selectedFile.name}
                </ThemedText>
                <ThemedText style={[styles.fileMeta, { color: theme.textSecondary }]}>
                  {formatFileSize(selectedFile.size)} · Tap to change
                </ThemedText>
              </View>
              <Ionicons name='checkmark-circle' size={22} color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.pickerIdle}>
              <View style={[styles.pickerIconRing, { backgroundColor: theme.uiBackground }]}>
                <Ionicons name='cloud-upload-outline' size={24} color={theme.textSecondary} />
              </View>
              <ThemedText style={[styles.pickerIdleTitle, { color: theme.textPrimary }]}>
                Select audio file
              </ThemedText>
              <ThemedText style={[styles.pickerIdleHint, { color: theme.textSecondary }]}>
                MP3 · WAV · M4A · up to 25 MB
              </ThemedText>
            </View>
          )}
        </Pressable>

        <View style={[styles.metaCard, { backgroundColor: theme.cardBackground }]}>

          {/* Title */}
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Title
            </ThemedText>
            <ThemedTextInput
              value={title}
              onChangeText={setTitle}
              onBlur={() => setTitleTouched(true)}
              placeholder='e.g. Hook idea / Chorus take'
              placeholderTextColor={theme.textSecondary + '70'}
              style={[
                styles.input,
                { borderColor: titleError ? '#ef4444' : theme.textSecondary + '35', color: theme.textPrimary },
              ]}
            />
            {titleError && <Text style={styles.errorText}>{titleError}</Text>}
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: theme.divider + '60' }]} />

          {/* Genre */}
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Genre
            </ThemedText>
            <ThemedTextInput
              value={genre}
              onChangeText={setGenre}
              onBlur={() => setGenreTouched(true)}
              placeholder='e.g. Hip-Hop, R&B, Pop'
              placeholderTextColor={theme.textSecondary + '70'}
              style={[
                styles.input,
                { borderColor: genreError ? '#ef4444' : theme.textSecondary + '35', color: theme.textPrimary },
              ]}
            />
            {genreError && <Text style={styles.errorText}>{genreError}</Text>}
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: theme.divider + '60' }]} />

          {/* Collaborator */}
          <View style={[styles.fieldGroup, styles.collaboratorSection]}>
            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Collaborator{' '}
              <ThemedText style={[styles.optionalTag, { color: theme.textSecondary + '80' }]}>
                (optional)
              </ThemedText>
            </ThemedText>

            <View
              style={styles.collaboratorInputRow}
              onLayout={e => setInputRowHeight(e.nativeEvent.layout.height)}
            >
              <ThemedTextInput
                value={collaboratorQuery}
                onChangeText={handleCollaboratorChange}
                onBlur={handleCollaboratorBlur}
                onFocus={handleCollaboratorFocus}
                placeholder='Search by username'
                placeholderTextColor={theme.textSecondary + '70'}
                autoCapitalize='none'
                autoCorrect={false}
                style={[
                  styles.input,
                  styles.collaboratorInput,
                  {
                    borderColor: collaboratorError
                      ? '#ef4444'
                      : resolvedCollaborator
                      ? Colors.primary
                      : theme.textSecondary + '35',
                    color: theme.textPrimary,
                  },
                ]}
              />
              {!!collaboratorQuery && (
                <Pressable onPress={handleClearCollaborator} style={styles.clearBtn} hitSlop={8}>
                  <Ionicons name='close-circle' size={18} color={theme.textSecondary} />
                </Pressable>
              )}

              {showSuggestions && inputRowHeight > 0 && (
                <View
                  style={[
                    styles.dropdown,
                    {
                      top: inputRowHeight + 4,
                      backgroundColor: isDark ? theme.uiBackground : '#ffffff',
                      borderColor: theme.textSecondary + '25',
                    },
                  ]}
                >
                  {suggestionsLoading ? (
                    <View style={styles.dropdownLoading}>
                      <ActivityIndicator size='small' color={theme.textSecondary} />
                    </View>
                  ) : suggestions.length === 0 ? (
                    <View style={styles.dropdownEmpty}>
                      <Ionicons name='search-outline' size={15} color={theme.textSecondary + '80'} />
                      <ThemedText style={[styles.dropdownEmptyText, { color: theme.textSecondary }]}>
                        No users found
                      </ThemedText>
                    </View>
                  ) : (
                    suggestions.map((suggestion, index) => (
                      <Pressable
                        key={suggestion.userId}
                        onPress={() => handleSelectSuggestion(suggestion)}
                        style={({ pressed }) => [
                          styles.suggestionRow,
                          index < suggestions.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.textSecondary + '20',
                          },
                          pressed && { backgroundColor: Colors.primary + '12' },
                        ]}
                      >
                        <Image
                          source={
                            suggestion.profileImage
                              ? { uri: suggestion.profileImage }
                              : require('../../assets/icon.png')
                          }
                          style={styles.suggestionAvatar}
                        />
                        <View style={styles.suggestionMeta}>
                          <Text style={[styles.suggestionUsername, { color: theme.textPrimary }]}>
                            {suggestion.username}
                          </Text>
                          {suggestion.name && suggestion.name !== suggestion.username && (
                            <Text style={[styles.suggestionName, { color: theme.textSecondary }]}>
                              {suggestion.name}
                            </Text>
                          )}
                        </View>
                        <Ionicons name='chevron-forward' size={14} color={theme.textSecondary + '70'} />
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>

            {resolvedCollaborator && (
              <View style={styles.resolvedBadge}>
                <Ionicons name='checkmark-circle' size={13} color={Colors.primary} />
                <ThemedText style={[styles.resolvedText, { color: Colors.primary }]}>
                  {resolvedCollaborator.username} confirmed
                </ThemedText>
              </View>
            )}

            {collaboratorError && (
              <Text style={styles.errorText}>{collaboratorError}</Text>
            )}
          </View>
        </View>

      </ScrollView>

      <View style={[styles.stickyFooter, { backgroundColor: theme.background, paddingBottom: navClearance }]}>
        {!selectedFile && (
          <ThemedText style={[styles.submitHint, { color: theme.textSecondary }]}>
            Select an audio file above to get started
          </ThemedText>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: isFormValid ? Colors.primary : theme.uiBackground },
            isUploading && styles.submitBtnUploading,
            pressed && isFormValid && { opacity: 0.82 },
          ]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size='small' color='#fff' />
              <Text style={[styles.submitBtnText, { color: '#fff' }]}>Uploading…</Text>
            </>
          ) : (
            <>
              <Ionicons
                name='cloud-upload-outline'
                size={20}
                color={isFormValid ? '#fff' : theme.textSecondary}
              />
              <Text style={[
                styles.submitBtnText,
                { color: isFormValid ? '#fff' : theme.textSecondary },
              ]}>
                Upload Snippet
              </Text>
            </>
          )}
        </Pressable>
      </View>

    </ThemedView>
  )
}

export default Upload

const styles = StyleSheet.create({
  container: {
      flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    paddingTop: 16,
    gap: 6,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'inter',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'inter',
  },
  pickerZone: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  pickerIdle: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  pickerIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pickerIdleTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  pickerIdleHint: {
    fontSize: 12,
    fontFamily: 'inter',
    letterSpacing: 0.2,
  },
  pickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  fileIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  fileMeta: {
    fontSize: 12,
    fontFamily: 'inter',
  },
  metaCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  fieldGroup: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'inter',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'inter',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'inter',
  },
  collaboratorSection: {
    zIndex: 100,
    elevation: 100,
  },
  collaboratorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collaboratorInput: {
    flex: 1,
  },
  clearBtn: {
    marginLeft: 8,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  resolvedText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'inter',
  },

  // ── Dropdown ───────────────────────────────────────────────────────────────
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  dropdownLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  dropdownEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dropdownEmptyText: {
    fontSize: 13,
    fontFamily: 'inter',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  suggestionMeta: {
    flex: 1,
    gap: 1,
  },
  suggestionUsername: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  suggestionName: {
    fontSize: 12,
    fontFamily: 'inter',
  },
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitBtnUploading: {
    opacity: 0.75,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'inter',
    letterSpacing: -0.2,
  },
  submitHint: {
    fontSize: 12,
    fontFamily: 'inter',
    textAlign: 'center',
    lineHeight: 18,
  },
})