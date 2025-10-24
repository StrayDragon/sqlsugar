/**
 * Position Calculator for V2 Editor
 *
 * Calculates optimal popover positions with smart placement algorithms
 */

import type {
  PopoverPosition,
  EnhancedVariable,
  EditorV2Config
} from '../types.js';

/**
 * Minimum spacing from viewport edges
 */
const MIN_EDGE_SPACING = 10;

/**
 * Default popover dimensions
 */
const POPOVER_DIMENSIONS = {
  width: 320,
  height: 280,
  arrowSize: 8
};

/**
 * Calculate optimal popover position for a variable
 */
export function calculatePopoverPosition(
  variable: EnhancedVariable,
  targetElement: HTMLElement,
  containerElement: HTMLElement,
  config: EditorV2Config,
  customDimensions?: { width: number; height: number; arrowSize: number }
): PopoverPosition {
  const dimensions = customDimensions || POPOVER_DIMENSIONS;
  const rect = targetElement.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  // Calculate available space
  const availableSpace = {
    top: rect.top - containerRect.top,
    bottom: containerRect.bottom - rect.bottom,
    left: rect.left - containerRect.left,
    right: containerRect.right - rect.right
  };

  // Determine best placement
  const placement = determineBestPlacement(
    availableSpace,
    dimensions,
    config.popoverPlacement
  );

  // Calculate exact coordinates
  const coordinates = calculateCoordinates(
    placement,
    rect,
    containerRect,
    dimensions
  );

  return {
    x: coordinates.x,
    y: coordinates.y,
    placement,
    availableSpace
  };
}

/**
 * Determine the best placement for the popover
 */
function determineBestPlacement(
  availableSpace: PopoverPosition['availableSpace'],
  dimensions: typeof POPOVER_DIMENSIONS,
  preferredPlacement: EditorV2Config['popoverPlacement']
): PopoverPosition['placement'] {
  // If auto placement, find the best fit
  if (preferredPlacement === 'auto') {
    return findBestAutoPlacement(availableSpace, dimensions);
  }

  // Check if preferred placement fits
  if (placementFits(preferredPlacement, availableSpace, dimensions)) {
    return preferredPlacement;
  }

  // Fall back to alternative placements
  const alternatives = getAlternativePlacements(preferredPlacement);
  for (const placement of alternatives) {
    if (placementFits(placement, availableSpace, dimensions)) {
      return placement;
    }
  }

  // Last resort: center in container
  return 'bottom';
}

/**
 * Find best automatic placement
 */
function findBestAutoPlacement(
  availableSpace: PopoverPosition['availableSpace'],
  dimensions: typeof POPOVER_DIMENSIONS
): PopoverPosition['placement'] {
  const scores = {
    top: availableSpace.top >= dimensions.height ? availableSpace.top : 0,
    bottom: availableSpace.bottom >= dimensions.height ? availableSpace.bottom : 0,
    left: availableSpace.left >= dimensions.width ? availableSpace.left : 0,
    right: availableSpace.right >= dimensions.width ? availableSpace.right : 0
  };

  // Find placement with maximum available space
  let bestPlacement: PopoverPosition['placement'] = 'bottom';
  let maxSpace = 0;

  for (const [placement, space] of Object.entries(scores)) {
    if (space > maxSpace) {
      maxSpace = space;
      bestPlacement = placement as PopoverPosition['placement'];
    }
  }

  return bestPlacement;
}

/**
 * Check if a placement fits in available space
 */
function placementFits(
  placement: PopoverPosition['placement'],
  availableSpace: PopoverPosition['availableSpace'],
  dimensions: typeof POPOVER_DIMENSIONS
): boolean {
  switch (placement) {
    case 'top':
      return availableSpace.top >= dimensions.height + MIN_EDGE_SPACING;
    case 'bottom':
      return availableSpace.bottom >= dimensions.height + MIN_EDGE_SPACING;
    case 'left':
      return availableSpace.left >= dimensions.width + MIN_EDGE_SPACING;
    case 'right':
      return availableSpace.right >= dimensions.width + MIN_EDGE_SPACING;
    default:
      return false;
  }
}

/**
 * Get alternative placements in order of preference
 */
function getAlternativePlacements(
  preferred: PopoverPosition['placement']
): PopoverPosition['placement'][] {
  const alternatives: Record<PopoverPosition['placement'], PopoverPosition['placement'][]> = {
    top: ['bottom', 'left', 'right'],
    bottom: ['top', 'left', 'right'],
    left: ['right', 'top', 'bottom'],
    right: ['left', 'top', 'bottom']
  };

  return alternatives[preferred] || ['bottom', 'top', 'left', 'right'];
}

/**
 * Calculate exact coordinates for the popover
 */
function calculateCoordinates(
  placement: PopoverPosition['placement'],
  targetRect: DOMRect,
  containerRect: DOMRect,
  dimensions: typeof POPOVER_DIMENSIONS
): { x: number; y: number } {
  const targetCenterX = targetRect.left + targetRect.width / 2 - containerRect.left;
  const targetCenterY = targetRect.top + targetRect.height / 2 - containerRect.top;

  let x = 0;
  let y = 0;

  switch (placement) {
    case 'top':
      x = targetCenterX - dimensions.width / 2;
      y = targetRect.top - containerRect.top - dimensions.height - POPOVER_DIMENSIONS.arrowSize;
      break;

    case 'bottom':
      x = targetCenterX - dimensions.width / 2;
      y = targetRect.bottom - containerRect.top + POPOVER_DIMENSIONS.arrowSize;
      break;

    case 'left':
      x = targetRect.left - containerRect.left - dimensions.width - POPOVER_DIMENSIONS.arrowSize;
      y = targetCenterY - dimensions.height / 2;
      break;

    case 'right':
      x = targetRect.right - containerRect.left + POPOVER_DIMENSIONS.arrowSize;
      y = targetCenterY - dimensions.height / 2;
      break;
  }

  // Ensure within container bounds
  x = Math.max(MIN_EDGE_SPACING, Math.min(x, containerRect.width - dimensions.width - MIN_EDGE_SPACING));
  y = Math.max(MIN_EDGE_SPACING, Math.min(y, containerRect.height - dimensions.height - MIN_EDGE_SPACING));

  return { x, y };
}

/**
 * Adjust position to handle scroll and resize
 */
export function adjustPositionForScroll(
  currentPosition: PopoverPosition,
  targetElement: HTMLElement,
  containerElement: HTMLElement,
  config: EditorV2Config,
  customDimensions?: { width: number; height: number; arrowSize: number }
): PopoverPosition {
  // Recalculate position based on current element positions
  return calculatePopoverPosition(
    {} as EnhancedVariable, // We don't need variable data for repositioning
    targetElement,
    containerElement,
    config,
    customDimensions
  );
}

/**
 * Check if popover should be repositioned
 */
export function shouldReposition(
  currentPos: PopoverPosition,
  targetElement: HTMLElement,
  containerElement: HTMLElement,
  threshold: number = 50
): boolean {
  const rect = targetElement.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  // Calculate current expected position
  const expectedCenterX = rect.left + rect.width / 2 - containerRect.left;
  const expectedCenterY = rect.top + rect.height / 2 - containerRect.top;

  // Calculate current popover center
  const currentCenterX = currentPos.x + POPOVER_DIMENSIONS.width / 2;
  const currentCenterY = currentPos.y + POPOVER_DIMENSIONS.height / 2;

  // Check distance from expected position
  const distance = Math.sqrt(
    Math.pow(expectedCenterX - currentCenterX, 2) +
    Math.pow(expectedCenterY - currentCenterY, 2)
  );

  return distance > threshold;
}

/**
 * Get arrow position for the popover
 */
export function getArrowPosition(
  placement: PopoverPosition['placement'],
  targetElement: HTMLElement,
  containerElement: HTMLElement,
  popoverWidth: number
): { left: number; top: number; rotation: string } {
  const rect = targetElement.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  const targetCenterX = rect.left + rect.width / 2 - containerRect.left;
  const targetCenterY = rect.top + rect.height / 2 - containerRect.top;

  let left = 0;
  let top = 0;
  let rotation = '0deg';

  switch (placement) {
    case 'top':
      left = targetCenterX - POPOVER_DIMENSIONS.arrowSize;
      top = POPOVER_DIMENSIONS.height - 1;
      rotation = '180deg';
      break;

    case 'bottom':
      left = targetCenterX - POPOVER_DIMENSIONS.arrowSize;
      top = -POPOVER_DIMENSIONS.arrowSize + 1;
      rotation = '0deg';
      break;

    case 'left':
      left = popoverWidth - POPOVER_DIMENSIONS.arrowSize + 1;
      top = targetCenterY - POPOVER_DIMENSIONS.arrowSize;
      rotation = '90deg';
      break;

    case 'right':
      left = -POPOVER_DIMENSIONS.arrowSize + 1;
      top = targetCenterY - POPOVER_DIMENSIONS.arrowSize;
      rotation = '-90deg';
      break;
  }

  return { left, top, rotation };
}

/**
 * Animate popover position change
 */
export function animatePositionChange(
  element: HTMLElement,
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
  duration: number = 200
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const deltaX = toPos.x - fromPos.x;
    const deltaY = toPos.y - fromPos.y;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentX = fromPos.x + deltaX * easeProgress;
      const currentY = fromPos.y + deltaY * easeProgress;

      element.style.transform = `translate(${currentX}px, ${currentY}px)`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * Handle viewport constraints
 */
export function handleViewportConstraints(
  position: PopoverPosition,
  containerElement: HTMLElement,
  dimensions: typeof POPOVER_DIMENSIONS
): PopoverPosition {
  const containerRect = containerElement.getBoundingClientRect();
  const scrollLeft = containerElement.scrollLeft;
  const scrollTop = containerElement.scrollTop;

  // Adjust for scroll position
  let adjustedX = position.x + scrollLeft;
  let adjustedY = position.y + scrollTop;

  // Ensure within horizontal bounds
  if (adjustedX < 0) {
    adjustedX = MIN_EDGE_SPACING;
  } else if (adjustedX + dimensions.width > containerRect.width) {
    adjustedX = containerRect.width - dimensions.width - MIN_EDGE_SPACING;
  }

  // Ensure within vertical bounds
  if (adjustedY < 0) {
    adjustedY = MIN_EDGE_SPACING;
  } else if (adjustedY + dimensions.height > containerRect.height) {
    adjustedY = containerRect.height - dimensions.height - MIN_EDGE_SPACING;
  }

  return {
    ...position,
    x: adjustedX,
    y: adjustedY
  };
}
