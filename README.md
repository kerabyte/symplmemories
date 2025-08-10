# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Homepage background slideshow

- The root page `/` renders a full-screen background slideshow using Embla Carousel with Autoplay + Fade.
- We enable `embla-carousel-class-names` so slides receive `.is-in-view` and our CSS fade works.
- Key bits:
  - In `src/app/page.tsx`, pass `plugins={[Autoplay(...), Fade(), ClassNames()]}` to `Carousel`.
  - In `src/app/globals.css`, `.embla__fade` starts at `opacity: 0`, and `.embla__fade.is-in-view { opacity: 1 }`.
  - Images are served via `next/image` with `fill` and `object-cover` to cover the viewport.
