# Room provocations

Each planning objective now has one editable room invitation: area/setup, materials, and observable actions plus a question. Activity suggestions return a matching invitation. Teachers can regenerate the invitation alone without changing activity, support, stretch, or questions.

## Compatibility and privacy

- Existing saved plans receive blank fields when read; no migration or observation writes are needed.
- The active framework and chosen progression level are checked server-side before generation.
- Setup suggestions use curriculum only, never learner observations or private notes.
- Optional image requests use the curriculum and teacher-edited setup only. The existing privacy scanner rejects detected personal or sensitive information in setup text. Teachers must still keep identifying information out.
- Editing an invitation or choosing a new activity clears its old image. Failed image requests leave the written plan unchanged.
- Save week retains one bounded JPEG per entry inside the workspace-protected planning document. Nothing regenerates on load. Each data URL is at most 160,000 characters, keeping a 15-entry plan below the platform request-size limit.

## Optional images

`OPENAI_API_KEY` is required, with access to the image model. `PLANNING_IMAGE_MODEL` defaults to `gpt-image-2`; `PLANNING_MODEL` remains the existing text-model setting. Image generation is user-triggered, one high-quality landscape image per request, without automatic retries. It incurs provider usage charges. The server has a 180-second execution allowance and a 150-second provider timeout. Confirm the deployment platform supports this allowance.

Generated images are labeled illustrations; teachers review material availability, age appropriateness and safety. They are not observation evidence. Images are resized and compressed using Sharp before saving; arbitrary remote image URLs are rejected.

The weekly PDF contains the concise setup. The optional detailed setup sheets include all three fields and the image when present. Text-only setup sheets also work. A broken image does not prevent the written plan from exporting.

## Verification

Run `npm test`, `npx tsc --noEmit`, and the production build. Planning tests cover legacy plans, field limits, exact selected objective context, image privacy screening, bounded JPEG round trips, optional PDF setup sheets and long-text pagination. Manually check generating a setup, editing it, saving/reloading, image failure, and PDF layout. Do not use real learner data for previews.
