import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createComment, toggleCommentLike } from "../lib/comments";
import { incrementSnippetCommentsCount } from "../lib/snippets";
import { avatar } from "../lib/appwrite";

const ThemedComments = ({ snippetId, initialComments = [], loading = false, theme, soundRef, position, user, profileImage, onCommentAdded, onCommentsUpdate }) => {
  const [comments, setComments] = useState(initialComments);
  const [textInput, setTextInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [openThreads, setOpenThreads] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setComments(initialComments);
  }, [snippetId, initialComments]);

  useEffect(() => {
    onCommentsUpdate?.(comments);
  }, [comments]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";

    const now = Date.now();
    const currentTime = new Date(timestamp).getTime();
    const diffMs = now - currentTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay =  Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's': ''} ago`;

    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date. getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
  }

  const handleAdd = async () => {
    if (!textInput.trim() || isSubmitting) return;

    setIsSubmitting(true)

    const newComment = {
      id: `temp-${Date.now()}`,
      username: user?.prefs?.username || "You",
      avatarUrl: user?.prefs?.avatarUrl || profileImage || null,
      text: textInput.trim(),
      time: Math.floor(position / 1000),
      likes: 0,
      likedByCurrentUser: false,
      replyTo: replyTo ? replyTo.id : null,
      createdAt: new Date().toISOString(),
    };

    const previousComments = [...comments];
    const inputValue = textInput;
    const replyToValue = replyTo;

    setComments((prev) => {
      if (!replyToValue) return [...prev, newComment];
      const index = prev.findIndex((c) => c.id === replyToValue.id);
      if (index === -1) return [...prev, newComment];
      const updated = [...prev];
      updated.splice(index + 1, 0, newComment);
      return updated;
    });
    setTextInput("");
    setReplyTo(null);

    try {
      const createdComment = await createComment({
        snippetId,
        content: inputValue,
        parentCommentId: replyToValue ? replyToValue.id : null,
        timestamp: Math.floor(position / 1000),
      });

      await incrementSnippetCommentsCount(snippetId, 1);

      onCommentAdded?.();

      setComments((prev) =>
        prev.map((c) => 
          c.id === newComment.id
            ? {
              id: createdComment.$id,
              username: createdComment.username,
              profileImage: createdComment.profileImage || null,
              text: createdComment.content,
              time: createdComment.timestamp || 0,
              likes: createdComment.likes || 0,
              likedByCurrentUser: false,
              replyTo: createdComment.parentCommentId || null,
              createdAt: createdComment.$createdAt,
            } 
          : c
        )
      );
    } catch (error) {
      console.error("Failed to add comment:", error);

      setComments(previousComments);
      setTextInput(inputValue);
      setReplyTo(replyToValue);

      alert("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const jumpToTime = async (sec) => {
    if (!soundRef?.current) return;
    try {
      await soundRef.current.setPositionAsync(sec * 1000);
    } catch (e) {
      console.warn("seek failed:", e);
    }
  };

  const toggleLike = async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !user?.$id) return;

    const wasLiked = comment.likedByCurrentUser;
    const currentLikes = comment.likes || 0;

    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        return {
          ...c,
          likes: wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
          likedByCurrentUser: !wasLiked,
        };
      })
    );

    try {
      await toggleCommentLike(commentId, wasLiked, user.$id);
    } catch (err) {
      console.error("Failed to update comment like:", err);

      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            likes: currentLikes,
            likedByCurrentUser: wasLiked,
          };
        })
      );

      alert("Failed to update like. Please try again.");
    }
  };

  const toggleThread = (id) => {
    setOpenThreads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.textSecondary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading comments...</Text>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, {color: theme.textSecondary }]}>No comments yet, Be the first!</Text>
          </View>
      ) : (
        comments.map((c, index) => {
          const replyCount = comments.filter((x) => x.replyTo === c.id).length;
          if (c.replyTo && !openThreads[c.replyTo]) return null;
          return (
            <View key={c.id} style={[styles.comment, c.replyTo ? styles.replyIndent : null]}>
              <View style={styles.header}>
                <Image
                  source={
                    c.avatarUrl
                      ? { uri: c.avatarUrl }
                      : c.username === (user?.prefs?.username || "You")
                        ? (profileImage ? { uri: profileImage } : require('../assets/icon.png'))
                        : require('../assets/icon.png')
                  }
                  style={styles.avatarImage}
                />
                <View style={styles.headerText}>
                  <Text style={[styles.username, { color: theme.textPrimary }]}>{c.username}</Text>
                  {c.createdAt && (
                    <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
                      {formatRelativeTime(c.createdAt)}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.text, { color: theme.textPrimary }]}>{c.text}</Text>
              <Pressable onPress={() => jumpToTime(c.time)}>
                <Text style={[styles.time, { color: '#06B6D4' }]}>
                  @{formatTime(c.time)}
                </Text>
              </Pressable>
              <Pressable onPress={() => setReplyTo({ id: c.id, username: c.username })}>
                <Text style={[styles.reply, { color: theme.textSecondary }]}>Reply</Text>
              </Pressable>

              <View style={styles.actionRow}>
                <Pressable style={styles.likeBtn} onPress={() => toggleLike(c.id)}>
                  <Ionicons name={c.likedByCurrentUser ? "thumbs-up" : "thumbs-up-outline"} size={18} color={c.likedByCurrentUser ? "#06B6D4" : theme.textSecondary}></Ionicons>
                  <Text style={[styles.likeCount, { color: theme.textSecondary }]}>{c.likes}</Text>
                </Pressable>

                {replyCount > 0 && (
                  <Pressable style={styles.replyCountBtn} onPress={() => toggleThread(c.id)}>
                    <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.replyCount, { color: theme.textSecondary }]}>{replyCount}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}

      <View style={styles.inputRow}>
        <TextInput
          placeholder={replyTo ? `Reply to ${replyTo.username}` : "Add comment"}
          placeholderTextColor={theme.textPrimary + "80"}
          value={textInput}
          onChangeText={setTextInput}
          editable={!isSubmitting}
          style={[styles.input, { borderColor: theme.textPrimary, color: theme.textPrimary }]}
        />
        <Pressable onPress={handleAdd} style={styles.sendBtn} disabled={isSubmitting || !textInput.trim()}>
          {isSubmitting ? (
            <ActivityIndicator size='small' color={theme.textPrimary} />
          ) : (
            <Ionicons name="send" size={20} color={textInput.trim() ? theme.textPrimary : theme.textSecondary} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default ThemedComments;

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingHorizontal: 8,
    width: "100%",
  },
  comment: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    flexDirection: "column",
    flex: 1,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 1,
  },
  text: {
    marginTop: 2,
    fontSize: 14,
  },
  time: {
    fontSize: 13,
    marginTop: 2,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  likeCount: {
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  input: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
  },
  sendBtn: {
    padding: 6,
  },
  reply: {
    fontSize: 12,
    marginTop: 2,
  },
  replyIndent: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
    paddingLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  replyCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyCount: {
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});