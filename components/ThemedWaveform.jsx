import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";

const ThemedWaveform = ({ snippetId, audioUri, theme, soundRef, isActive = false, duration = 0, position = 0, onPlay, onPositionChange, onDurationChange }) => {
  const [bars] = useState(
    Array.from({ length: 40 }).map(() => 10 + Math.random() * 30)
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [waveWidth, setWaveWidth] = useState(0);

  const progress = duration > 0 ? position / duration : 0;
  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
    } else if (isActive && !soundRef.current) {
      const loadAndPlay = async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { 
              shouldPlay: true,
              positionMillis: position || 0
            },
            onPlaybackStatusUpdate
          );
          soundRef.current = sound;
          setIsPlaying(true);
        } catch (e) {
          console.warn("Error auto-loading audio on activation:", e);
        }
      }
      loadAndPlay();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !soundRef.current) return;

    const checkStatus = async () => {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
        }
      } catch (err) {
        console.warn("Error checking status:", e);
      }
    };

    const interval = setInterval(checkStatus, 100);
    return () => clearInterval(interval);
  }, [isActive, soundRef.current]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded || !isActive) return;

    if (status.durationMillis && onDurationChange) {
      onDurationChange(status.durationMillis);
    }

    if (status.positionMillis !== undefined && onPositionChange) {
      onPositionChange(status.positionMillis);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      if (onPositionChange) {
        onPositionChange(0);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!isActive) {
      // Stop and unload any currently playing audio before switching
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
        } catch (e) {
          console.warn("Error stopping previous audio:", e);
        }
        soundRef.current = null;
      }
      
      // Now notify parent to make this snippet active and load its audio
      if (onPlay) {
        onPlay();
      }
      return;
    }

    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { 
              shouldPlay: true,
              positionMillis: position || 0
            },
            onPlaybackStatusUpdate
          );
          soundRef.current = sound;
          setIsPlaying(true);
          return;
        }

        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (e) {
        console.warn("Error toggling playback:", e);
      }
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: true,
          positionMillis: position || 0
        },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.warn("Error loading audio:", err)
    }
  };

  const formatTime = (ms) => {
    if (!ms || ms === 0) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const displayDuration = duration > 0 ? formatTime(duration) : "--:--";
  const displayPosition = formatTime(position);


  const handleSeek = async (e) => {
    if (!waveWidth || !soundRef.current || !duration || !isActive) return;

    const tapX = e.nativeEvent.locationX;
    const newRatio = Math.min(Math.max(tapX / waveWidth, 0), 1);
    const newPos = newRatio * duration;

    if (onPositionChange) {
      onPositionChange(newPos);
    }

    try {
      await soundRef.current.setPositionAsync(newPos);
    } catch (err) {
      console.warn("seek error:", err);
    }
  };

  const activeBarsCount = Math.round(progress * bars.length);

  const getAnimatedStyles = (isActive, h) => {
    const opacity = useSharedValue(isActive ? 1 : 0.3);
    const height = useSharedValue(isActive ? h : h * 0.6);

    useEffect(() => {
        if (isActive) {
        opacity.value = withTiming(1, { duration: 160 });
        height.value = withSpring(h, { damping: 10, stiffness: 120 });
        } else {
        opacity.value = withTiming(0.3, { duration: 140 });
        height.value = withTiming(h * 0.6, { duration: 180 });
        }
    }, [isActive]);

    return useAnimatedStyle(() => ({
        opacity: opacity.value,
        height: height.value,
    }));
  };

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
            const animatedStyle = getAnimatedStyles(isActive, h);
            return (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  animatedStyle,
                  {
                    backgroundColor: isActive
                      ? theme.textPrimary
                      : theme.textSecondary + "40",
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.timerRow}>
        <Text style={[styles.timerText, { color: theme.textSecondary }]}>
          {displayPosition}
        </Text>
        <Text style={[styles.timerText, { color: theme.textSecondary }]}>
          {displayDuration}
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