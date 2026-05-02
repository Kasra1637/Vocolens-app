/**
 * Glass Surface Design System
 *
 * Provides the layered glass treatment used across all surfaces in the app.
 * Every surface, border, specular, shadow, and glow derives from the
 * user's selected theme primary color via hexToRgba().
 *
 * Usage:
 *   import { hexToRgba, glassCard, glassSpecular, glassBorders, GlassLayers } from '@/lib/glass';
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Color Utility ────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Style Factories ──────────────────────────────────────────────────────────

export interface GlassCardOptions {
  borderRadius?: number;
  primaryColor?: string;
}

/** Returns the outer container style for a glass card (no blur) */
export function glassCard({ borderRadius = 20, primaryColor = '#8B5CF6' }: GlassCardOptions = {}): ViewStyle {
  return {
    borderRadius,
    overflow: 'hidden',
  };
}

/** Returns the tint wash background (layer 2, behind content) */
export function glassWash(primaryColor: string): ViewStyle {
  return {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hexToRgba(primaryColor, 0.1),
  };
}

/** Returns the specular highlight line style (top edge) */
export function glassSpecular(primaryColor: string, borderRadius = 20): ViewStyle {
  return {
    position: 'absolute',
    top: 0.5,
    left: Math.min(borderRadius * 0.5, 12),
    right: Math.min(borderRadius * 0.5, 12),
    height: 1,
    backgroundColor: hexToRgba(primaryColor, 0.18),
    borderRadius: 0.5,
  };
}

/** Returns the bottom shadow line style */
export function glassBottomShadow(primaryColor: string, borderRadius = 20): ViewStyle {
  return {
    position: 'absolute',
    bottom: 0.5,
    left: Math.min(borderRadius * 0.5, 12),
    right: Math.min(borderRadius * 0.5, 12),
    height: 1,
    backgroundColor: hexToRgba(primaryColor, 0.15),
    borderRadius: 0.5,
  };
}

/** Returns the outer border style */
export function glassOuterBorder(primaryColor: string, borderRadius = 20): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius,
    borderWidth: 1,
    borderColor: hexToRgba(primaryColor, 0.1),
  };
}

/** Returns the inner glow border style */
export function glassInnerBorder(primaryColor: string, borderRadius = 20): ViewStyle {
  return {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: borderRadius - 2,
    borderWidth: 0.5,
    borderColor: hexToRgba(primaryColor, 0.05),
  };
}

/** Top light gradient config */
export function glassTopGradientColors(primaryColor: string): readonly [string, string] {
  return [hexToRgba(primaryColor, 0.08), 'transparent'] as const;
}

// ─── Component: GlassLayers ───────────────────────────────────────────────────

interface GlassLayersProps {
  primaryColor: string;
  borderRadius?: number;
  /** Add a BlurView base layer. Use for panels/modals/headers — NOT for inline cards. */
  blur?: boolean;
  blurIntensity?: number;
  isDarkMode?: boolean;
}

/**
 * Renders the full layered glass surface stack.
 * Place as the FIRST child inside a container with `overflow: 'hidden'`.
 * Content renders on top of these layers.
 */
export function GlassLayers({
  primaryColor,
  borderRadius = 20,
  blur = false,
  blurIntensity = 90,
  isDarkMode = true,
}: GlassLayersProps) {
  const inset = StyleSheet.absoluteFill;
  return (
    <>
      {blur && (
        <BlurView
          intensity={blurIntensity}
          tint={isDarkMode ? 'dark' : 'dark'}
          style={inset}
        />
      )}
      <View style={[inset, glassWash(primaryColor)]} />
      <LinearGradient
        colors={glassTopGradientColors(primaryColor)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 30,
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
        }}
      />
      <View style={glassSpecular(primaryColor, borderRadius)} />
      <View style={glassBottomShadow(primaryColor, borderRadius)} />
      <View style={glassOuterBorder(primaryColor, borderRadius)} />
      <View style={glassInnerBorder(primaryColor, borderRadius)} />
    </>
  );
}

// ─── Component: GlassCard ─────────────────────────────────────────────────────

interface GlassCardProps {
  primaryColor: string;
  borderRadius?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Drop-in replacement for card surfaces. Renders the full glass treatment
 * (tint wash, top gradient, specular, bottom shadow, borders) with content.
 */
export function GlassCard({
  primaryColor,
  borderRadius = 20,
  children,
  style,
}: GlassCardProps) {
  return (
    <View style={[glassCard({ borderRadius, primaryColor }), style]}>
      <GlassLayers primaryColor={primaryColor} borderRadius={borderRadius} />
      {children}
    </View>
  );
}
