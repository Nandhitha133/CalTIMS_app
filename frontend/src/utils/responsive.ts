import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (e.g. iPhone X/11 Pro)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scales a size based on the screen width. Useful for scaling widths, margins, paddings.
 * @param size the size to scale
 * @returns the scaled size
 */
export const scale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scales a size based on the screen height. Useful for scaling heights.
 * @param size the size to scale
 * @returns the scaled size
 */
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

/**
 * Moderately scales a size. Useful for font sizes or elements where you don't want a 1:1 linear scale on larger screens (like tablets).
 * @param size the size to scale
 * @param factor a factor to control how much scaling happens (default is 0.5)
 * @returns the scaled size
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Convenience function to quickly determine if we're on a small device (e.g., iPhone SE)
 */
export const isSmallDevice = width < 375;
