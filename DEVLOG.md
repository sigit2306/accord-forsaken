## Chapter 14 – Playable Demo Lock

**Version:** v0.1.0  
**Status:** Locked learning checkpoint

### What works
- Player movement with camera follow
- Rust zone blocks player unless Silence is active
- Directional knockback when entering rust without Silence
- Silence meter drains while held, regenerates otherwise
- Visual distortion when Silent inside rust
- HUD displays Silence and Vitality
- Camera shake + rust feedback on impact

### Design intent
This chapter demonstrates:
- Silence as a resource, not a toggle
- Rust as environmental hostility, not a wall
- Player learning through physical feedback (knockback + fatigue)

### Known limitations
- Player avatar is still a placeholder rectangle
- No death / respawn logic yet
- Vitality does not decrease yet (planned for Chapter 15)
- No tilemap or art pass

### Learning notes
- Knockback direction must be derived from previous frame position
- Overlap + collider state separation is crucial
- Simplicity > correctness for early prototyping

### Next goals
- Convert knockback into a small state machine
- Add damage + exhaustion when Silence hits zero
- Introduce shrine respawn loop (Chapter 15)


# Devlog

## Chapter 14 Demo – v0.1.0  
**Tag:** `chapter-14-demo-v0.1`

This marks the first fully playable vertical slice of *The Accord of the Forsaken World*.

### Implemented
- Core player movement with camera-follow
- Rust zones that reject the player unless Silence is active
- Silence meter (drain & recovery)
- Vitality system with damage from:
  - Rust knockback
  - Silence depletion
- Directional knockback based on entry direction
- Visual feedback:
  - Screen shake on impact
  - Rust pulse feedback
  - Player distortion while holding Silence
- HUD:
  - Silence bar + text
  - Vitality text
- Chapter-scoped world layout (Chapter 14)

### Design Notes
- Silence is treated as a *resource*, not a toggle
- Rust is not a wall, but a *pressure*
- Player is intentionally fragile at this stage

### Tech Notes
- Prototype uses simple rectangles instead of sprites
- No tilemaps yet; focus is on mechanics and feel
- Code intentionally kept in a single scene for clarity

This version is locked as a learning and design checkpoint before adding:
- Death screen & fade
- Respawn shrine
- Player state handling improvements
