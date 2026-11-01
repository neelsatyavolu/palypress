import React from "react";
import { View, StyleSheet } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

interface YouTubePlayerProps {
  videoId: string;
  height?: number;
}

export function YouTubePlayer({ videoId, height = 210 }: YouTubePlayerProps) {
  return (
    <View style={styles.container}>
      <YoutubePlayer
        height={height}
        videoId={videoId}
        play={false} // Don't autoplay
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
});
