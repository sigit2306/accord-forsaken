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
