# Art references

Reference images for the `procedural-modeler` subagent. It reads everything here before modeling and compares its renders side by side with these images. Renders it produces go to `art/renders/` (not committed).

These are AI-generated style references, not exact blueprints. Car details differ slightly between images; when they disagree, `sedan-turnaround.jpg` is the authority for proportions.

| File | Use it for |
| --- | --- |
| `sedan-hero.jpg` | Hero blue sedan, photoreal look: paint, glass, lights, overall finish. |
| `sedan-turnaround.jpg` | Same sedan from front, rear, side and top. Check proportions against this. |
| `supermarket-lot-day.jpg` | Supermarket lot by day: asphalt cracks, worn markings, prop density. |
| `alley-rain-night.jpg` | Narrow alley on a rainy night: wet reflections, volumetric light, brick and corrugated metal. |
| `cars/blue-rally-sedan.png` | Parked car model `rally`: compact rally sedan, hood scoop, tall rear wing, gold multi-spoke wheels. |
| `cars/yellow-widebody-sedan.png` | Parked car model `widebody`: widebody sports sedan, front splitter, hood vents, rear wing, black wheels. |
| `cars/white-muscle-fastback.png` | Parked car model `fastback`: 1960s fastback muscle car, twin stripes, long hood, chrome bumpers. |
| `cars/yellow-roadster.png` | Parked car model `roadster`: small two-seat open roadster with roll hoops. |

The car photos are user-supplied inspiration for shape, proportions, stance and signature details only. Models must not carry real brand logos, badges, names or trademark text; badges stay blank and plates use the game's invented numbers. Sizes live in `src/vehicle/carModels.ts` (the collision box reads the same table); view one with `/?show=car_<model>&az=<deg>&el=<deg>`.
