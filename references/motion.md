# Motion

What makes a film feel made instead of assembled. These came from two films and two rounds of independent review of
each cut.

## The six rules

1. **Something survives every cut.** The beam becomes the light entering the prism; the request box shrinks into
   the speech bubble; a point on a chart grows into the sky. Name it in the storyboard's `carries`. Hand it over at
   the exact pixel position, so the last frame of one shot and the first of the next agree about it.
2. **The foreground becomes the transition.** A heading or a shape flies through the camera while the next scene is
   already in place behind it. No empty frame between scenes: fade the outgoing thing out before the incoming one
   has to be read, or delay the incoming one a few frames.
3. **A move is a camera move.** When the scene whips, the stage behind it travels too (`film.whip` does this; for
   your own moves tween `stage.camx` or `stage.camy`), and the scene blurs along the direction of travel
   (`film.motionBlur`). A layer sliding over a still background reads as a slide.
4. **Vary the cut.** A horizontal whip, then a vertical one, then a dive into an object, then a flash. The same
   transition three times in a row is noticed.
5. **Land, then leave.** Things ease into a readable landing and leave fast. `expo.out` and `back.out` for arrivals,
   `power3.in` for exits. A constant drift reads as a screensaver.
6. **Cause and effect.** A click makes a ring; a ray hitting a molecule makes it glow; a counter locks with a tick.
   Every animated action visibly produces something.

## Pace

- Cut on the music's beat. Count shot lengths in beats in the storyboard; put the big moments (the question, the
  name, the last line) on bars.
- A new picture about every three seconds; nothing motionless for more than about 0.6 seconds. Holds that carry
  reading (a chart with its number, the recap) keep a slow push of 3 to 5 percent.
- The first frame is a finished picture, with something already moving.
- The last frame is a poster and holds for two seconds or more, breathing.

## Type as motion

- Headings arrive by character (`split` + `typeIn`) or slam in by line (scale from 1.5, blur to sharp), on the beat.
- One sheen across a heading after it has landed (`sheen`).
- The accent word is the point of the sentence. One accent word or phrase per heading.

## What reviewers caught, so you do not repeat it

- A thing shown one frame before its animation starts, in the pose its last use left it: a visible pop. Show it on
  the frame its tween starts.
- A `fromTo`'s start value leaking backwards (an element sitting on screen for seconds before its moment). Use
  `immediateRender: false`.
- Two versions of the same text cross-fading for a few frames. Swap on one frame.
- A giant blurred heading sitting over the incoming scene for eight frames. Fade it before the scene arrives.
- A hard-edged disc wiping across a button as a "ripple". Use a soft whole-surface flash.
- A one-pixel hard line where a gradient term started at a horizon. Make the term symmetric about the line.
- Speed lines across the whole frame while nothing readable is on screen. Keep the subject visible through the move.
- A 3D object flat as a filled rectangle. It needs a gradient across its face, a bevel that catches a rim light,
  and a light close enough to draw a falloff.
- Proof beats that were a heading and one row of chips: slides. Each needs a real object that fills the frame.
- A scene where one small element sits alone for more than a second.
