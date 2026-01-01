import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";

const ThemedWaveform = ({ audioUri, theme }) => {
  const [bars] = useState(
    Array.from({ length: 40 }).map(() => 10 + Math.random() * 30)
  );

  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [waveWidth, setWaveWidth] = useState(0);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) return;

    if (status.durationMillis) {
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      const ratio = status.positionMillis / status.durationMillis;
      setProgress(ratio || 0);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setProgress(1);
    }
  };

  const handlePlayPause = async () => {
    if (!soundRef.current) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } catch (e) {
        console.warn("Error loading audio:", e);
      }
      return;
    }

    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSeek = async (e) => {
    if (!waveWidth || !soundRef.current || !duration) return;

    const tapX = e.nativeEvent.locationX;
    const newRatio = Math.min(Math.max(tapX / waveWidth, 0), 1);
    const newPos = newRatio * duration;

    setProgress(newRatio);
    setPosition(newPos);

    try {
      await soundRef.current.setPositionAsync(newPos);
    } catch (err) {
      console.warn("seek error:", err);
    }
  };

  const activeBarsCount = Math.round(progress * bars.length);

  return (
    <View style={styles.container}>
      <View
        style={styles.waveOuter}
        onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleSeek}
      >
        <View style={styles.barRow}>
          {bars.map((h, i) => {
            const isActive = i < activeBarsCount;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: isActive
                      ? theme.textPrimary
                      : theme.textSecondary + "40",
                    opacity: isActive ? 1 : 0.3,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.timerRow}>
        <Text style={[styles.timerText, { color: theme.textSecondary }]}>
          {formatTime(position)}
        </Text>
        <Text style={[styles.timerText, { color: theme.textSecondary }]}>
          {formatTime(duration)}
        </Text>
      </View>

      <View style={styles.controls}>
        <Ionicons
          name="play-skip-back"
          size={26}
          color={theme.textSecondary}
        />
        <Pressable onPress={handlePlayPause}>
          <Ionicons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={40}
            color={theme.textPrimary}
          />
        </Pressable>
        <Ionicons
          name="play-skip-forward"
          size={26}
          color={theme.textSecondary}
        />
      </View>
    </View>
  );
};

export default ThemedWaveform;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  waveOuter: {
    width: "100%",
    height: 60,
    overflow: "hidden",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: "100%",
  },
  bar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  timerText: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 10,
  },
});