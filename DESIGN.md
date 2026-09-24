# Open Music Station — visual system

## Direction
Operate like a late-night listening desk: matte near-black paper, graphite surfaces, one signal-lime accent, and editorial type that makes the next listen feel intentional. The interface is a station, not a content marketplace.

## Tokens
- Canvas: `#0d0e0c`; panels: `#161814`; raised panel: `#20231d`; text: `#f2f3ec`; muted: `#8b9185`; accent: `#d7f45b`; border: `#2c3129`.
- Typography: system sans for UI, Georgia for the one expressive station headline.
- Radius: 4px for controls, 10px for panels, 18px for artwork.
- Motion: short ease-out transitions only; respect reduced motion.

## Composition
Desktop uses a 236px navigation rail, a flexible content stage, and a fixed 88px player rail. Mobile collapses the rail into a compact top bar and keeps the player reachable at the bottom.

## Components
Track rows carry artwork, title/artist, metadata, reason, and one clear play affordance. Panels are matte with hairline borders; avoid gradients, glows, and dashboard metric cards.
