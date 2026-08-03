import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useWindowDimensions, ViewStyle, TextStyle } from 'react-native';
import { ColorPalettes, Typography, LayoutStyle } from '../theme/theme';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

// ----------------------------------------------------
// 1. APPSHELL COMPONENT (Centered Responsive Container)
// ----------------------------------------------------
interface AppShellProps {
  children: React.ReactNode;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const AppShell: React.FC<AppShellProps> = ({ children, themeMode = 'light' }) => {
  const { width } = useWindowDimensions();
  const colors = ColorPalettes[themeMode];

  // Enforce Max Widths
  const isLargeDesktop = width >= 1600;
  const isDesktop = width >= 1200 && width < 1600;
  const isTablet = width >= 768 && width < 1200;

  const shellWidth = isLargeDesktop ? 1400 : isDesktop ? 1160 : isTablet ? '90%' : '100%';

  return (
    <View style={[styles.shellOuter, { backgroundColor: colors.background }]}>
      <View style={[styles.shellInner, { width: shellWidth as any }]}>
        {children}
      </View>
    </View>
  );
};

// ----------------------------------------------------
// 2. GAMECARD COMPONENT (Premium Glassmorphic Card)
// ----------------------------------------------------
interface GameCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  themeMode?: 'light' | 'dark' | 'colorblind';
  headerTitle?: string;
  gradientHeaderColor?: string;
}

export const GameCard: React.FC<GameCardProps> = ({ children, style, themeMode = 'light', headerTitle, gradientHeaderColor }) => {
  const colors = ColorPalettes[themeMode];
  const scale = useSharedValue(1);

  const hoverStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.98); };
  const handlePressOut = () => { scale.value = withSpring(1.0); };

  return (
    <Animated.View 
      style={[
        styles.cardOuter, 
        LayoutStyle.glassCard, 
        { backgroundColor: colors.surface, borderColor: colors.primary }, 
        hoverStyle, 
        style
      ]}
    >
      {headerTitle && (
        <View style={[styles.cardHeader, { backgroundColor: gradientHeaderColor || colors.primary }]}>
          <Text style={styles.cardHeaderTitle}>{headerTitle.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        {children}
      </View>
    </Animated.View>
  );
};

// ----------------------------------------------------
// 3. HEROCARD COMPONENT (Split RPG Dashboard Header)
// ----------------------------------------------------
interface HeroCardProps {
  avatar: string;
  name: string;
  level: number;
  xp: number;
  maxXp: number;
  coins: number;
  diamonds: number;
  streak: number;
  achievementsCount: number;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const HeroCard: React.FC<HeroCardProps> = ({
  avatar,
  name,
  level,
  xp,
  maxXp,
  coins,
  diamonds,
  streak,
  achievementsCount,
  themeMode = 'light'
}) => {
  const colors = ColorPalettes[themeMode];
  const xpPercent = Math.min((xp / maxXp) * 100, 100);

  return (
    <View style={[styles.heroCardOuter, LayoutStyle.glassCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
      <View style={styles.heroSplitRow}>
        
        {/* Left Section (Avatar, Name, League) */}
        <View style={styles.heroLeft}>
          <View style={[styles.heroAvatarCircle, { borderColor: colors.secondary }]}>
            <Text style={{ fontSize: 40 }}>{avatar}</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.heroNameText, { color: colors.textPrimary }]}>{name}</Text>
            <Text style={[styles.heroLeagueBadge, { color: colors.accent }]}>🏆 Gold Guild III</Text>
          </View>
        </View>

        {/* Center Section (XP progress bar) */}
        <View style={styles.heroCenter}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[styles.heroLevelText, { color: colors.textPrimary }]}>Level {level}</Text>
            <Text style={[styles.heroXpText, { color: colors.textSecondary }]}>{xp}/{maxXp} XP</Text>
          </View>
          <View style={styles.xpProgressTrack}>
            <View style={[styles.xpProgressFill, { width: `${xpPercent}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Right Section (Stats Counter Badges) */}
        <View style={styles.heroRight}>
          <CurrencyBadge value={coins} type="coin" themeMode={themeMode} />
          <CurrencyBadge value={diamonds} type="diamond" themeMode={themeMode} />
          <View style={[styles.heroMinBadge, { backgroundColor: '#FFF', borderColor: colors.border }]}>
            <Text style={{ fontSize: 13 }}>🔥 {streak}d</Text>
          </View>
          <View style={[styles.heroMinBadge, { backgroundColor: '#FFF', borderColor: colors.border }]}>
            <Text style={{ fontSize: 13 }}>🏅 {achievementsCount}</Text>
          </View>
        </View>

      </View>
    </View>
  );
};

// ----------------------------------------------------
// 4. CURRENCYBADGE COMPONENT
// ----------------------------------------------------
interface CurrencyBadgeProps {
  value: number;
  type: 'coin' | 'diamond';
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = ({ value, type, themeMode = 'light' }) => {
  const colors = ColorPalettes[themeMode];
  const emoji = type === 'coin' ? '🪙' : '💎';
  return (
    <View style={[styles.currencyBadgeBox, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
      <Text style={{ fontSize: 15 }}>{emoji}</Text>
      <Text style={[styles.currencyValueText, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

// ----------------------------------------------------
// 5. SECTIONTITLE COMPONENT
// ----------------------------------------------------
interface SectionTitleProps {
  title: string;
  icon?: string;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, icon, themeMode = 'light' }) => {
  const colors = ColorPalettes[themeMode];
  return (
    <View style={styles.sectionHeaderRow}>
      {icon && <Text style={{ fontSize: 24, marginRight: 8 }}>{icon}</Text>}
      <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>{title.toUpperCase()}</Text>
      <View style={[styles.titleUnderline, { backgroundColor: colors.secondary }]} />
    </View>
  );
};

// ----------------------------------------------------
// 6. PROGRESSCARD COMPONENT
// ----------------------------------------------------
interface ProgressCardProps {
  title: string;
  percent: number;
  color?: string;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const ProgressCard: React.FC<ProgressCardProps> = ({ title, percent, color, themeMode = 'light' }) => {
  const colors = ColorPalettes[themeMode];
  return (
    <View style={styles.progressCardContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.progressPercentText, { color: colors.textSecondary }]}>{percent}%</Text>
      </View>
      <View style={styles.progressTrackBg}>
        <View style={[styles.progressFillColor, { width: `${percent}%`, backgroundColor: color || colors.primary }]} />
      </View>
    </View>
  );
};

// ----------------------------------------------------
// 7. QUESTCARD COMPONENT (Game Mode Cards)
// ----------------------------------------------------
interface QuestCardProps {
  title: string;
  subtitle: string;
  icon: string;
  difficulty: string;
  reward: string;
  timeLimit: string;
  onPress: () => void;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const QuestCard: React.FC<QuestCardProps> = ({
  title,
  subtitle,
  icon,
  difficulty,
  reward,
  timeLimit,
  onPress,
  themeMode = 'light'
}) => {
  const colors = ColorPalettes[themeMode];
  const scale = useSharedValue(1);

  const hoverStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.96, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1.0, { duration: 100 }); }}
      style={{ width: '48%', marginBottom: 16 }}
    >
      <Animated.View 
        style={[
          styles.questCardInner, 
          LayoutStyle.glassCard, 
          { backgroundColor: colors.surface, borderColor: colors.border },
          hoverStyle
        ]}
      >
        <View style={styles.questRow}>
          <Text style={{ fontSize: 32 }}>{icon}</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.questTitleText, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.questSubtitleText, { color: colors.textSecondary }]}>{subtitle}</Text>
            <View style={styles.questDetailsRow}>
              <Text style={[styles.questDetailBadge, { backgroundColor: '#E2E8F0', color: colors.textPrimary }]}>{difficulty}</Text>
              <Text style={[styles.questDetailBadge, { backgroundColor: '#FEF3C7', color: '#B45309' }]}>{reward}</Text>
              <Text style={[styles.questDetailBadge, { backgroundColor: '#DBEAFE', color: '#1D4ED8' }]}>{timeLimit}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ----------------------------------------------------
// 8. WORLDNODE COMPONENT (circular World path elements)
// ----------------------------------------------------
interface WorldNodeProps {
  name: string;
  percent: number;
  locked: boolean;
  isBoss?: boolean;
  onPress?: () => void;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const WorldNode: React.FC<WorldNodeProps> = ({
  name,
  percent,
  locked,
  isBoss = false,
  onPress,
  themeMode = 'light'
}) => {
  const colors = ColorPalettes[themeMode];

  const renderNodeIcon = () => {
    if (locked) return '⛓️';
    if (isBoss) return '🏰';
    if (percent === 100) return '⭐';
    return '🌀';
  };

  return (
    <View style={styles.worldNodeCenter}>
      <TouchableOpacity
        disabled={locked}
        onPress={onPress}
        style={[
          styles.worldCircle,
          { backgroundColor: locked ? '#CBD5E1' : colors.surface, borderColor: locked ? '#94A3B8' : colors.primary },
          isBoss && { width: 100, height: 100, borderRadius: 50, borderWidth: 4 },
          !locked && styles.worldCircleActive
        ]}
      >
        <Text style={{ fontSize: isBoss ? 40 : 32 }}>{renderNodeIcon()}</Text>
        {percent > 0 && <Text style={styles.nodePercent}>{percent}%</Text>}
      </TouchableOpacity>
      <Text style={[styles.nodeLabel, { color: colors.textPrimary }]}>
        {name.toUpperCase()} {isBoss && '👹'}
      </Text>
    </View>
  );
};

// ----------------------------------------------------
// 9. ANIMATEDBUTTON COMPONENT (tactile gradient action button)
// ----------------------------------------------------
interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  themeMode?: 'light' | 'dark' | 'colorblind';
  color?: string;
  style?: ViewStyle;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  themeMode = 'light',
  color,
  style
}) => {
  const colors = ColorPalettes[themeMode];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.95, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1.0, { duration: 80 }); }}
      style={[styles.btnWrapper, style]}
    >
      <Animated.View
        style={[
          LayoutStyle.gradientButton,
          { backgroundColor: color || colors.primary },
          animStyle
        ]}
      >
        <Text style={styles.btnTextContent}>{title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ----------------------------------------------------
// 10. STATCARD COMPONENT
// ----------------------------------------------------
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: string;
  themeMode?: 'light' | 'dark' | 'colorblind';
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, icon, themeMode = 'light' }) => {
  const colors = ColorPalettes[themeMode];
  return (
    <View style={[styles.statCardOuter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {icon && <Text style={{ fontSize: 24, marginBottom: 4 }}>{icon}</Text>}
      <Text style={[styles.statCardVal, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statCardLbl, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
};

interface Dice3DProps {
  value: number;
}

export const Dice3D: React.FC<Dice3DProps> = ({ value }) => {
  const renderDots = () => {
    const dots: { top: string; left: string }[] = [];
    if (value === 1) {
      dots.push({ top: '42%', left: '42%' });
    } else if (value === 2) {
      dots.push({ top: '15%', left: '15%' });
      dots.push({ top: '69%', left: '69%' });
    } else if (value === 3) {
      dots.push({ top: '15%', left: '15%' });
      dots.push({ top: '42%', left: '42%' });
      dots.push({ top: '69%', left: '69%' });
    } else if (value === 4) {
      dots.push({ top: '15%', left: '15%' });
      dots.push({ top: '15%', left: '69%' });
      dots.push({ top: '69%', left: '15%' });
      dots.push({ top: '69%', left: '69%' });
    } else if (value === 5) {
      dots.push({ top: '15%', left: '15%' });
      dots.push({ top: '15%', left: '69%' });
      dots.push({ top: '42%', left: '42%' });
      dots.push({ top: '69%', left: '15%' });
      dots.push({ top: '69%', left: '69%' });
    } else if (value === 6) {
      dots.push({ top: '15%', left: '15%' });
      dots.push({ top: '15%', left: '69%' });
      dots.push({ top: '42%', left: '15%' });
      dots.push({ top: '42%', left: '69%' });
      dots.push({ top: '69%', left: '15%' });
      dots.push({ top: '69%', left: '69%' });
    }

    return dots.map((d, index) => (
      <View
        key={index}
        style={[
          styles.diceDot,
          {
            top: d.top as any,
            left: d.left as any,
          },
        ]}
      />
    ));
  };

  return (
    <View style={styles.diceContainer3D}>
      <View style={styles.diceBevelFace}>
        <View style={styles.diceFaceSurface}>
          {renderDots()}
        </View>
      </View>
    </View>
  );
};


// ----------------------------------------------------
// GLOBAL STYLES
// ----------------------------------------------------
const styles = StyleSheet.create({
  shellOuter: {
    minHeight: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  shellInner: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  cardOuter: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cardHeaderTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cardContent: {
    padding: 20,
  },
  heroCardOuter: {
    width: '100%',
    marginBottom: 28,
  },
  heroSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 260,
    marginVertical: 8,
  },
  heroAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNameText: {
    fontSize: 20,
    fontWeight: '900',
  },
  heroLeagueBadge: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  heroCenter: {
    flex: 1,
    minWidth: 300,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  heroLevelText: {
    fontSize: 14,
    fontWeight: '900',
  },
  heroXpText: {
    fontSize: 12,
    fontWeight: '800',
  },
  xpProgressTrack: {
    height: 18,
    backgroundColor: '#E2E8F0',
    borderRadius: 9,
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 320,
    marginVertical: 8,
  },
  heroMinBadge: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: 'center',
  },
  currencyBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginLeft: 8,
  },
  currencyValueText: {
    fontWeight: '900',
    marginLeft: 6,
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    position: 'relative',
    paddingBottom: 8,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  titleUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  progressCardContainer: {
    width: '100%',
    marginVertical: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrackBg: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFillColor: {
    height: '100%',
  },
  questCardInner: {
    width: '100%',
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questTitleText: {
    fontSize: 16,
    fontWeight: '900',
  },
  questSubtitleText: {
    fontSize: 11,
    marginTop: 2,
  },
  questDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  questDetailBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 4,
    overflow: 'hidden',
  },
  worldNodeCenter: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  worldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  worldCircleActive: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  nodePercent: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#16A34A',
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    borderRadius: 8,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  btnWrapper: {
    width: '100%',
  },
  btnTextContent: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  statCardOuter: {
    width: '48%',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statCardVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  statCardLbl: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  diceContainer3D: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    paddingBottom: 4,
  },
  diceBevelFace: {
    flex: 1,
    backgroundColor: '#94A3B8',
    borderRadius: 10,
    paddingBottom: 3,
  },
  diceFaceSurface: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94A3B8',
    position: 'relative',
    padding: 6,
  },
  diceDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#0F172A',
  },
});
