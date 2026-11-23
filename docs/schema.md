# Better Form – note schema

Every note the plugin manages is plain Markdown with YAML frontmatter. Two keys identify it:

- `forma` – the note type (`day`, `workout`, `exercise`, `template`, `program`, `test`, `gear`, `pain`, `goal`, `norm`, `supplement`, `plan`)
- `schema` – the schema version (currently `1`); the plugin migrates older notes and never touches notes from a newer version

Everything below can be read by Obsidian **Bases** or **Dataview** without the plugin. Write to these notes through the plugin where you can – it validates values and keeps generated blocks (`<!-- forma:start -->` … `<!-- forma:end -->`) in sync. Your own text outside those markers is never changed.

Links (exercises, templates, programs, shoes, pain) are stored as wikilinks, e.g. `"[[Bench press]]"`. Dates are `YYYY-MM-DD`, times `HH:MM`.

## Day – `forma: day`

One note per day (folder *Journal*).

| Key | Type | Meaning |
|---|---|---|
| `date` | date | the day |
| `sleep.duration_min` | number | sleep without awakenings, minutes |
| `sleep.quality` | 1–5 | how well you slept |
| `sleep.bedtime`, `sleep.sleep_onset`, `sleep.wake` | time | went to bed, fell asleep, woke up |
| `sleep.awakenings`, `sleep.morning_feeling` | number | awakenings, morning feeling 1–5 |
| `check_in.fatigue`, `check_in.soreness`, `check_in.mood`, `check_in.stress`, `check_in.motivation` | 1–5 | morning check-in |
| `hrv.rmssd_ms` | number | morning HRV (RMSSD) |
| `hrv.resting_hr` | number | resting heart rate |
| `body.weight_kg`, `body.body_fat_pct` | number | weight, body fat |
| `body.waist_cm`, `body.hips_cm`, `body.chest_cm`, `body.arm_cm`, `body.thigh_cm` | number | measurements |
| `steps` | number | steps |
| `supplements` | list | supplements taken that day |
| `habits` | list | habits from the habit journal that day (alcohol, late meal…) |
| `period` | boolean | `true` on a period day (Menstrual cycle module); missing = no or not logged |
| `notes` | text | note |

## Workout – `forma: workout`

One note per workout (folder *Workouts*).

| Key | Type | Meaning |
|---|---|---|
| `date`, `start` | date, time | when |
| `sport` | `run`, `strength`, `swim`, `calisthenics`, `kettlebell`, `rope`, `other` | sport |
| `title` | text | name |
| `template`, `program` | link | the template or program it came from |
| `duration_min` | number | duration |
| `rpe` | 0–10 | session RPE (load = RPE × minutes) |
| `source` | `manual`, `strava`, `file`, … | where it came from |
| `run.distance_km`, `run.moving_time_s`, `run.avg_hr`, `run.max_hr`, `run.elevation_m`, `run.cadence_spm` | number | run data |
| `run.type`, `run.shoes` | text, link | run type, shoes |
| `run.best_s` | map | fastest splits in seconds (`1k`, `5k`, …) |
| `blocks` | list | exercises: `type` (`sets`, `hold`, `emom`, `amrap`, `ladder`, `complex`, `timed`), `exercise` and `sets` with `reps`, `kg`, `added_kg`, `sec`, `rir`, `warmup`, `tag` |
| `pain` | list of links | pain logged with the workout |

## Weekly plan – `forma: plan`

| Key | Meaning |
|---|---|
| `week` | Monday of the week |
| `items` | planned workouts: `id`, `date`, `sport`, `title`, `template`, `duration_min`, `intensity` (`low`, `mid`, `high`), `distance_km`, `notes`; items from a calendar (Runna) also have `source` and `uid` |
| `off` | days off: `date`, `reason` (`rest`, `illness`, `vacation`) |

## Other notes

- **Exercise** (`forma: exercise`) – `name`, `aliases`, `category`, `kind`, `measure`, `muscles.primary`, `muscles.secondary`, `equipment`, `progression.ladder`, `progression.level`.
- **Program** (`forma: program`) – `name`, `days`, `items` (exercise, target, optional `alternate: a|b|c`), `active`, `active_since`, `session_min`, `intensity`.
- **Goal** (`forma: goal`) – `name`, `type` (`run_time`, `lift_1rm`, `reps_max`, `skill_level`, `weekly_volume`, `body_weight`, `norm`), `target`, `deadline`, `status`.
- **Pain** (`forma: pain`) – `name`, `muscle`, `side`, `level` 0–10, `since`, `status`, `history`.
- **Test, norm, gear, template, supplement** – see `src/model/types.ts` in the repository.

## Metrics in your own daily note (optional)

With *Settings → Training and equipment → Metrics in your daily note* turned on, the plugin writes these properties into your existing daily note (the one from Obsidian's Daily notes plugin) and changes nothing else in it:

`bf_readiness` (0–100), `bf_load` (AU), `bf_sleep_h`, `bf_hrv`, `bf_rhr`, `bf_weight`, `bf_steps`, `bf_workouts`, `bf_workout_min`, `bf_run_km`.

## Examples

A Base filtered to workouts – in a `.base` file:

```yaml
filters:
  and:
    - forma == "workout"
properties:
  sport: { displayName: Sport }
  duration_min: { displayName: Minutes }
  rpe: { displayName: RPE }
views:
  - type: table
    name: Workouts
    order: [date, sport, title, duration_min, rpe]
```

Dataview – runs of the last 30 days with distance:

```dataview
TABLE date, run.distance_km AS "km", duration_min AS "min"
WHERE forma = "workout" AND sport = "run" AND date >= date(today) - dur(30 days)
SORT date DESC
```

Dataview – readiness and sleep from your daily notes:

```dataview
TABLE bf_readiness AS "Readiness", bf_sleep_h AS "Sleep", bf_hrv AS "HRV"
FROM "Daily"
WHERE bf_readiness
SORT file.name DESC
LIMIT 14
```
