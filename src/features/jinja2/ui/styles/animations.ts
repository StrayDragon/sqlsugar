/**
 * Animation Styles and Effects for V2 Editor
 *
 * Centralized animation definitions and utilities
 */

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500
} as const;

/**
 * Animation easing functions
 */
export const ANIMATION_EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Custom easing
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  swift: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
} as const;

/**
 * Common animation keyframes
 */
export const ANIMATION_KEYFRAMES = {
  // Fade animations
  fadeIn: `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,
  fadeOut: `
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `,
  fadeScale: `
    @keyframes fadeScale {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,

  // Slide animations
  slideInUp: `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  slideInDown: `
    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  slideInLeft: `
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,

  // Scale animations
  scaleIn: `
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  scaleOut: `
    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0);
      }
    }
  `,

  // Bounce animations
  bounceIn: `
    @keyframes bounceIn {
      0% {
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
      70% {
        transform: scale(0.9);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0, 0, 0);
      }
      40%, 43% {
        transform: translate3d(0, -30px, 0);
      }
      70% {
        transform: translate3d(0, -15px, 0);
      }
      90% {
        transform: translate3d(0, -4px, 0);
      }
    }
  `,

  // Pulse animations
  pulse: `
    @keyframes pulse {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
        transform: scale(1.2);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  pulseGlow: `
    @keyframes pulseGlow {
      0% {
        box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
      }
    }
  `,

  // Loading animations
  spin: `
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `,
  dash: `
    @keyframes dash {
      0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
      }
      100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
      }
    }
  `,

  // Highlight animations
  highlight: `
    @keyframes highlight {
      0% {
        background-color: rgba(66, 133, 244, 0);
      }
      50% {
        background-color: rgba(66, 133, 244, 0.3);
      }
      100% {
        background-color: rgba(66, 133, 244, 0);
      }
    }
  `,

  // Shake animation (for errors)
  shake: `
    @keyframes shake {
      0%, 100% {
        transform: translateX(0);
      }
      10%, 30%, 50%, 70%, 90% {
        transform: translateX(-5px);
      }
      20%, 40%, 60%, 80% {
        transform: translateX(5px);
      }
    }
  `
} as const;

/**
 * Generate CSS for animations
 */
export function generateAnimationCSS(): string {
  return Object.values(ANIMATION_KEYFRAMES).join('\n');
}

/**
 * Animation utility class
 */
export class AnimationManager {
  private static animationQueue: Set<string> = new Set();
  private static callbacks: Map<string, () => void> = new Map();

  /**
   * Play an animation on an element
   */
  static playAnimation(
    element: HTMLElement,
    animationName: string,
    duration: number = ANIMATION_DURATIONS.normal,
    easing: string = ANIMATION_EASING.easeInOut,
    onComplete?: () => void
  ): void {
    const animationId = `${animationName}_${Date.now()}_${Math.random()}`;

    this.animationQueue.add(animationId);

    if (onComplete) {
      this.callbacks.set(animationId, onComplete);
    }

    element.style.animation = `${animationName} ${duration}ms ${easing}`;

    const handleAnimationEnd = () => {
      element.removeEventListener('animationend', handleAnimationEnd);
      element.style.animation = '';

      this.animationQueue.delete(animationId);

      const callback = this.callbacks.get(animationId);
      if (callback) {
        callback();
        this.callbacks.delete(animationId);
      }
    };

    element.addEventListener('animationend', handleAnimationEnd);
  }

  /**
   * Fade in an element
   */
  static fadeIn(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.normal,
    onComplete?: () => void
  ): void {
    element.style.opacity = '0';
    element.style.display = '';

    requestAnimationFrame(() => {
      this.playAnimation(element, 'fadeIn', duration, ANIMATION_EASING.easeOut, onComplete);
    });
  }

  /**
   * Fade out an element
   */
  static fadeOut(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.normal,
    onComplete?: () => void
  ): void {
    this.playAnimation(element, 'fadeOut', duration, ANIMATION_EASING.easeIn, () => {
      element.style.display = 'none';
      if (onComplete) onComplete();
    });
  }

  /**
   * Slide an element up
   */
  static slideInUp(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.normal,
    onComplete?: () => void
  ): void {
    this.playAnimation(element, 'slideInUp', duration, ANIMATION_EASING.easeOut, onComplete);
  }

  /**
   * Scale in an element with bounce
   */
  static bounceIn(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.slow,
    onComplete?: () => void
  ): void {
    this.playAnimation(element, 'bounceIn', duration, ANIMATION_EASING.easeOut, onComplete);
  }

  /**
   * Add pulse effect to an element
   */
  static pulse(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.slow,
    infinite: boolean = false
  ): void {
    element.style.animation = `pulse ${duration}ms ${ANIMATION_EASING.easeInOut} ${infinite ? 'infinite' : ''}`;
  }

  /**
   * Add pulse glow effect to an element
   */
  static pulseGlow(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.slow,
    infinite: boolean = false
  ): void {
    element.style.animation = `pulseGlow ${duration}ms ${ANIMATION_EASING.easeInOut} ${infinite ? 'infinite' : ''}`;
  }

  /**
   * Shake an element (for errors)
   */
  static shake(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.normal
  ): void {
    this.playAnimation(element, 'shake', duration, ANIMATION_EASING.easeInOut);
  }

  /**
   * Highlight an element
   */
  static highlight(
    element: HTMLElement,
    duration: number = ANIMATION_DURATIONS.normal
  ): void {
    this.playAnimation(element, 'highlight', duration, ANIMATION_EASING.easeInOut);
  }

  /**
   * Clear all animations on an element
   */
  static clearAnimations(element: HTMLElement): void {
    element.style.animation = '';
    element.style.transition = '';
  }

  /**
   * Check if animations are enabled globally
   */
  static areAnimationsEnabled(): boolean {
    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return !prefersReducedMotion;
    }
    return true;
  }

  /**
   * Get safe animation duration based on user preferences
   */
  static getSafeDuration(duration: number): number {
    if (!this.areAnimationsEnabled()) {
      return 0;
    }
    return duration;
  }

  /**
   * Create a transition utility
   */
  static createTransition(
    properties: string[],
    duration: number = ANIMATION_DURATIONS.normal,
    easing: string = ANIMATION_EASING.ease,
    delay: number = 0
  ): string {
    return properties.map(prop => `${prop} ${duration}ms ${easing} ${delay}ms`).join(', ');
  }

  /**
   * Animate a number change
   */
  static animateValue(
    element: HTMLElement,
    start: number,
    end: number,
    duration: number = ANIMATION_DURATIONS.normal,
    formatter?: (value: number) => string
  ): void {
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = start + (end - start) * easeProgress;

      if (formatter) {
        element.textContent = formatter(currentValue);
      } else {
        element.textContent = Math.round(currentValue).toString();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Animate color change
   */
  static animateColor(
    element: HTMLElement,
    startColor: string,
    endColor: string,
    duration: number = ANIMATION_DURATIONS.normal
  ): void {
    const startTime = performance.now();

    // Simple color interpolation (works for hex colors)
    const interpolateColor = (start: string, end: string, factor: number): string => {
      const startRGB = this.hexToRgb(start);
      const endRGB = this.hexToRgb(end);

      if (!startRGB || !endRGB) return end;

      const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * factor);
      const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * factor);
      const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * factor);

      return `rgb(${r}, ${g}, ${b})`;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentColor = interpolateColor(startColor, endColor, easeProgress);

      element.style.color = currentColor;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

/**
 * CSS custom properties for animations
 */
export const ANIMATION_CSS_PROPERTIES = `
  :root {
    --animation-duration-instant: ${ANIMATION_DURATIONS.instant}ms;
    --animation-duration-fast: ${ANIMATION_DURATIONS.fast}ms;
    --animation-duration-normal: ${ANIMATION_DURATIONS.normal}ms;
    --animation-duration-slow: ${ANIMATION_DURATIONS.slow}ms;
    --animation-duration-slower: ${ANIMATION_DURATIONS.slower}ms;

    --animation-easing-linear: ${ANIMATION_EASING.linear};
    --animation-easing-ease: ${ANIMATION_EASING.ease};
    --animation-easing-ease-in: ${ANIMATION_EASING.easeIn};
    --animation-easing-ease-out: ${ANIMATION_EASING.easeOut};
    --animation-easing-ease-in-out: ${ANIMATION_EASING.easeInOut};
    --animation-easing-bounce: ${ANIMATION_EASING.bounce};
    --animation-easing-smooth: ${ANIMATION_EASING.smooth};
    --animation-easing-swift: ${ANIMATION_EASING.swift};
  }
`;

/**
 * Default animation configuration
 */
export const DEFAULT_ANIMATION_CONFIG = {
  enabled: true,
  duration: ANIMATION_DURATIONS.normal,
  easing: ANIMATION_EASING.easeInOut,
  respectReducedMotion: true
} as const;
