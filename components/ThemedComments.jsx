import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ThemedComments = ({ theme, soundRef, position, user, profileImage }) => {
  const [comments, setComments] = useState([
    {
      id: 1,
      username: "Username 2",
      text: "Can this be a bit smoother?",
      time: 32,
      likes: 15,
      likedByCurrentUser: false,
    },
    {
      id: 2,
      username: "Username 3",
      text: "Love this note!!",
      time: 72,
      likes: 25,
      likedByCurrentUser: false,
    },
  ]);

  const [textInput, setTextInput] = useState("");

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAdd = () => {
    if (!textInput.trim()) return;

    const newComment = {
      id: Date.now(),
      username: user?.prefs?.username || "You",
      avatarUrl: user?.prefs?.avatarUrl || profileImage || null,
      text: textInput,
      time: Math.floor(position / 1000),
      likes: 0,
      likedByCurrentUser: false,
    };

    setComments((prev) => [...prev, newComment]);
    setTextInput("");
  };

  const jumpToTime = async (sec) => {
    if (!soundRef?.current) return;
    try {
      await soundRef.current.setPositionAsync(sec * 1000);
    } catch (e) {
      console.warn("seek failed:", e);
    }
  };

  const toggleLike = (id) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const hasLiked = c.likedByCurrentUser;
        return {
          ...c,
          likes: hasLiked ? c.likes - 1 : c.likes + 1,
          likedByCurrentUser: !hasLiked,
        };
      })
    );
  };

  return (
    <View style={styles.container}>
      {comments.map((c) => (
        <View key={c.id} style={styles.comment}>
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
            <Text style={[styles.username, { color: theme.textPrimary }]}>{c.username}</Text>
          </View>
          <Text style={[styles.text, { color: theme.textPrimary }]}>{c.text}</Text>
          <Pressable onPress={() => jumpToTime(c.time)}>
            <Text style={[styles.time, { color: '#06B6D4' }]}>
              @{formatTime(c.time)}
            </Text>
          </Pressable>

          <Pressable style={styles.likeBtn} onPress={() => toggleLike(c.id)}>
            <Ionicons name="thumbs-up-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.likeCount, { color: theme.textSecondary }]}>{c.likes}</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Add comment"
          placeholderTextColor={theme.textPrimary + "80"}
          value={textInput}
          onChangeText={setTextInput}
          style={[styles.input, { borderColor: theme.textPrimary, color: theme.textPrimary }]}
        />
        <Pressable onPress={handleAdd} style={styles.sendBtn}>
          <Ionicons name="send" size={20} color={theme.textPrimary} />
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
});