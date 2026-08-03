import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

interface VisualEnvironmentProps {
  world: string;
  reduceMotion?: boolean;
}

export const VisualEnvironment: React.FC<VisualEnvironmentProps> = ({ world, reduceMotion = false }) => {
  if (reduceMotion) return null;

  switch (world) {
    case 'Space':
      return <SpaceEnvironment />;
    case 'Castle':
      return <CastleEnvironment />;
    case 'Volcano':
      return <VolcanoEnvironment />;
    default:
      return null;
  }
};

const SpaceEnvironment = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 30000 }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.fullscreen} pointerEvents="none">
      {/* Drifting Nebula */}
      <Animated.View style={[styles.nebula, animStyle]} />
    </View>
  );
};

const CastleEnvironment = () => {
  const torchPulse = useSharedValue(1);

  useEffect(() => {
    torchPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(0.9, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      opacity: torchPulse.value,
      transform: [{ scale: torchPulse.value }],
    };
  });

  return (
    <View style={styles.fullscreen} pointerEvents="none">
      {/* Glowing Torch glows on sides */}
      <Animated.View style={[styles.torch, styles.leftTorch, animStyle]} />
      <Animated.View style={[styles.torch, styles.rightTorch, animStyle]} />
    </View>
  );
};

const VolcanoEnvironment = () => {
  const emberPosition = useSharedValue(0);

  useEffect(() => {
    emberPosition.value = withRepeat(
      withTiming(-100, { duration: 3000 }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: emberPosition.value }],
    };
  });

  return (
    <View style={styles.fullscreen} pointerEvents="none">
      {/* Red ambient heat aura at bottom */}
      <View style={styles.lavaAmbient} />
      <Animated.View style={[styles.ember, animStyle]} />
    </View>
  );
};

const styles: any = {
  fullscreen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  nebula: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.08)', // Faint Indigo
    filter: 'blur(30px)' as any,
  },
  torch: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.25)', // Red Orange Glow
    filter: 'blur(10px)' as any,
  },
  leftTorch: {
    top: '30%',
    left: 10,
  },
  rightTorch: {
    top: '30%',
    right: 10,
  },
  lavaAmbient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(249, 115, 22, 0.08)', // Volcano Orange Heat
    filter: 'blur(20px)' as any,
  },
  ember: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F97316',
  },
};
export default VisualEnvironment;
