import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface ParticleSystemProps {
  active: boolean;
  type: 'confetti' | 'stars' | 'sparks' | 'smoke';
  count?: number;
  reduceParticles?: boolean;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  active,
  type,
  count = 20,
  reduceParticles = false,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const targetCount = reduceParticles ? Math.floor(count / 3) : count;

  const colors = {
    confetti: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
    stars: ['#FBBF24', '#FCD34D', '#FFF', '#FFE082'],
    sparks: ['#F97316', '#EF4444', '#F59E0B'],
    smoke: ['#9CA3AF', '#D1D5DB', '#E5E7EB'],
  };

  useEffect(() => {
    if (active) {
      const generated: Particle[] = Array.from({ length: targetCount }).map((_, i) => {
        return {
          id: `${Date.now()}-${i}`,
          x: Math.random() * SCREEN_WIDTH,
          y: type === 'confetti' ? -20 : SCREEN_HEIGHT / 2, // Confetti falls from top, others emit from middle
          color: colors[type][Math.floor(Math.random() * colors[type].length)],
          size: Math.random() * 8 + 4,
        };
      });
      setParticles(generated);
    } else {
      setParticles([]);
    }
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ParticleItem key={p.id} particle={p} type={type} />
      ))}
    </View>
  );
};

const ParticleItem = ({ particle, type }: { particle: Particle; type: string }) => {
  const posY = useSharedValue(particle.y);
  const posX = useSharedValue(particle.x);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const duration = type === 'confetti' ? 2500 : 1000;
    const targetY = type === 'confetti' ? SCREEN_HEIGHT : particle.y + (Math.random() * 200 - 100);
    const targetX = type === 'confetti' ? particle.x + (Math.random() * 100 - 50) : particle.x + (Math.random() * 200 - 100);

    posY.value = withTiming(targetY, { duration });
    posX.value = withTiming(targetX, { duration });
    opacity.value = withTiming(0, { duration });
    scale.value = withTiming(0.2, { duration });
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: posY.value,
      left: posX.value,
      width: particle.size,
      height: particle.size,
      backgroundColor: particle.color,
      borderRadius: type === 'stars' ? particle.size / 2 : 4,
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return <Animated.View style={animStyle} />;
};
export default ParticleSystem;
