import { StyleSheet, View, Text, Pressable, Image, Modal, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Colors } from '../constants/Colors';
import { updateDownloadPermission, deleteMessage } from '../lib/messageService';
import ThemedDownloadPermission from './ThemedDownloadPermission';

const TIMESTAMP_RE = /@\d{1,2}:\d{2}(?::\d{2})?/g;

const MessageText = ({ content, textColor, isMine }) => {
  const parts = [];
  let last = 0;
  let match;
  TIMESTAMP_RE.lastIndex = 0;
  while ((match = TIMESTAMP_RE.exec(content)) !== null) {
    if (match.index > last) {
      parts.push({ text: content.slice(last, match.index), isTimestamp: false });
    }
    parts.push({ text: match[0], isTimestamp: true });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    parts.push({ text: content.slice(last), isTimestamp: false });
  }

  return (
    <Text style={{ fontSize: 15, fontFamily: 'inter', lineHeight: 21, color: textColor }}>
      {parts.map((part, i) =>
        part.isTimestamp ? (
          <Text
            key={i}
            style={{
              color: isMine ? '#fff' : Colors.primary,
              fontWeight: '700',
              backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : Colors.primary + '22',
              borderRadius: 4,
            }}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        )
      )}
    </Text>
  );
};

const formatTime = (ms) => {
  if (!ms) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ fileUrl, theme, isMine }) => {
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const onPlaybackStatus = (status) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis ?? 0);
    setDuration(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!soundRef.current) {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUrl },
          { shouldPlay: true },
          onPlaybackStatus
        );
        soundRef.current = sound;
        setIsLoading(false);
      } else if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Audio playback error:', err);
    }
  };

  const bubbleAccent = isMine ? 'rgba(255,255,255,0.25)' : Colors.primary + '33';
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.audioPlayer}>
      <Pressable
        style={[styles.playBtn, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : Colors.primary + '22' }]}
        onPress={handlePlayPause}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isMine ? '#fff' : Colors.primary} />
        ) : (
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={isMine ? '#fff' : Colors.primary}/>
        )}
      </Pressable>

      <View style={styles.waveContainer}>
        {/* Simple progress bar instead of waveform */}
        <View style={[styles.progressTrack, { backgroundColor: bubbleAccent }]}>
          <View style={[ styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isMine ? 'rgba(255,255,255,0.85)' : Colors.primary}]}/>
        </View>
        <Text style={[styles.audioTime, { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
          {formatTime(isPlaying || position > 0 ? position : duration)}
        </Text>
      </View>
    </View>
  );
};

const ThemedMessageBubble = ({ message, isMine, recipientUsername, conversationId, onPermissionChange, onMessageDeleted }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);

  const isAudio = message.type === 'audio';

  const handleLongPress = () => {
    if (isMine) setOptionsVisible(true);
  };

  const handleDownload = async () => {
    if (!message.fileUrl || !message.fileName) return;
    try {
      setDownloading(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Unavailable', 'Sharing is not available on this device.');
        return;
      }
      const tempUri = FileSystem.cacheDirectory + message.fileName;
      await FileSystem.downloadAsync(message.fileUrl, tempUri);
      await Sharing.shareAsync(tempUri, {
        mimeType: message.mimeType ?? 'audio/mpeg',
        dialogTitle: 'Save or share audio',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to download the file.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePermissionConfirm = async (allowed) => {
    setPermissionModalVisible(false);
    if (allowed === message.downloadPermission) return;
    try {
      setUpdatingPermission(true);
      await updateDownloadPermission(message.$id, allowed);
      onPermissionChange?.(message.$id, allowed);
    } catch (err) {
      Alert.alert('Error', 'Could not update permission.');
    } finally {
      setUpdatingPermission(false);
    }
  };

  const handleDelete = async () => {
    setOptionsVisible(false);
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(message.$id, message.fileId, conversationId);
            onMessageDeleted?.(message.$id);
          } catch (err) {
            Alert.alert('Error', 'Could not delete message.');
          }
        },
      },
    ]);
  };

  const bubbleBg = isMine
    ? Colors.primary
    : colorScheme === 'dark'
    ? theme.uiBackground
    : theme.cardBackground;

  const textColor = isMine ? '#fff' : theme.textPrimary;
  const timeColor = isMine ? 'rgba(255,255,255,0.65)' : theme.textSecondary;

  const timeStr = (() => {
    try {
      const d = new Date(message.createdAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  return (
    <>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}
      >
        {!isMine && (
          <View style={styles.avatarWrap}>
            {message.senderProfileImage ? (
              <Image source={{ uri: message.senderProfileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.uiBackground }]}>
                <Ionicons name="person" size={14} color={theme.textSecondary} />
              </View>
            )}
          </View>
        )}

        <View style={[styles.bubbleColumn, isMine ? styles.bubbleColumnMine : styles.bubbleColumnTheirs]}>
          <View style={[styles.bubble, { backgroundColor: bubbleBg, maxWidth: '100%' }]}>
            {/* Audio content */}
            {isAudio && (
              <>
                <AudioPlayer fileUrl={message.fileUrl} theme={theme} isMine={isMine} />

                {message.fileName ? (
                  <Text style={[styles.audioFileName, { color: isMine ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]} numberOfLines={1}>
                    {message.fileName}
                  </Text>
                ) : null}

                {!isMine && message.downloadPermission && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.downloadBtn,
                      { backgroundColor: theme.uiBackground, opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={14} color={Colors.primary} />
                        <Text style={[styles.downloadBtnText, { color: Colors.primary }]}>Download</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {isMine && (
                  <Pressable
                    style={styles.permBadge}
                    onPress={() => setPermissionModalVisible(true)}
                    disabled={updatingPermission}
                  >
                    {updatingPermission ? (
                      <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                    ) : (
                      <>
                        <Ionicons
                          name={message.downloadPermission ? 'download-outline' : 'lock-closed-outline'}
                          size={12}
                          color="rgba(255,255,255,0.7)"
                        />
                        <Text style={styles.permBadgeText}>
                          {message.downloadPermission ? 'Download on' : 'Download off'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}

            {message.content ? (
              <MessageText content={message.content} textColor={textColor} isMine={isMine} />
            ) : null}
          </View>

          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            {timeStr}
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable style={styles.optOverlay} onPress={() => setOptionsVisible(false)}>
          <Pressable
            style={[styles.optSheet, { backgroundColor: theme.navBackground }]}
            onPress={() => {}}
          >
            <Text style={[styles.optTitle, { color: theme.textSecondary }]}>Message Options</Text>

            {isAudio && (
              <Pressable
                style={[styles.optRow, { borderBottomColor: theme.divider }]}
                onPress={() => {
                  setOptionsVisible(false);
                  setPermissionModalVisible(true);
                }}
              >
                <Ionicons
                  name={message.downloadPermission ? 'lock-closed-outline' : 'download-outline'}
                  size={20}
                  color={theme.textPrimary}
                />
                <Text style={[styles.optLabel, { color: theme.textPrimary }]}>
                  {message.downloadPermission ? 'Disable Download' : 'Enable Download'}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.optRow}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.optLabel, { color: '#ef4444' }]}>Delete Message</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ThemedDownloadPermission
        visible={permissionModalVisible}
        recipientUsername={recipientUsername}
        fileName={message.fileName}
        currentPermission={isAudio ? message.downloadPermission : undefined}
        onConfirm={handlePermissionConfirm}
        onCancel={() => setPermissionModalVisible(false)}
      />
    </>
  );
};

export default ThemedMessageBubble;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubbleColumn: {
    flexDirection: 'column',
    maxWidth: '75%',
  },
  bubbleColumnMine: {
    alignItems: 'flex-end',
  },
  bubbleColumnTheirs: {
    alignItems: 'flex-start',
  },
  avatarWrap: {
    marginRight: 8,
    marginBottom: 19,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'inter',
    lineHeight: 21,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'inter',
    marginTop: 4,
    marginHorizontal: 4,
    alignSelf: 'flex-end',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  audioTime: {
    fontSize: 11,
    fontFamily: 'inter',
  },
  audioFileName: {
    fontSize: 12,
    fontFamily: 'inter',
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  permBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  permBadgeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'inter',
  },
  // Options modal
  optOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 4,
  },
  optTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'inter',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingVertical: 12,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optLabel: {
    fontSize: 16,
    fontFamily: 'inter',
    fontWeight: '500',
  },
});
