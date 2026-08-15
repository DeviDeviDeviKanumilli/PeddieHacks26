-- Deterministic reference and exercise catalog fixtures.
-- No auth users, secrets, diagnoses, raw media, or production user data belong here.

insert into public.body_regions (id, label, side, parent_id, sort_order)
values
  ('head_neck', 'Head and neck', 'central', null, 10),
  ('torso', 'Torso', 'central', null, 20),
  ('pelvis', 'Pelvis', 'central', null, 30),
  ('upper_body', 'Upper body', 'central', null, 40),
  ('lower_body', 'Lower body', 'central', null, 50),
  ('shoulders', 'Shoulders', 'central', 'upper_body', 60),
  ('upper_back', 'Upper back', 'central', 'upper_body', 65),
  ('upper_arms', 'Upper arms', 'central', 'upper_body', 70),
  ('elbows', 'Elbows', 'central', 'upper_body', 80),
  ('forearms_hands', 'Forearms and hands', 'central', 'upper_body', 90),
  ('lower_back', 'Lower back', 'central', 'torso', 95),
  ('hips', 'Hips', 'central', 'lower_body', 100),
  ('thighs', 'Thighs', 'central', 'lower_body', 110),
  ('knees', 'Knees', 'central', 'lower_body', 120),
  ('lower_legs', 'Lower legs', 'central', 'lower_body', 130),
  ('ankles_feet', 'Ankles and feet', 'central', 'lower_body', 140)
on conflict (id) do update set label = excluded.label, parent_id = excluded.parent_id, sort_order = excluded.sort_order;

insert into public.body_regions (id, label, side, parent_id, sort_order)
values
  ('left_shoulder', 'Left shoulder', 'left', 'shoulders', 201),
  ('right_shoulder', 'Right shoulder', 'right', 'shoulders', 202),
  ('left_upper_arm', 'Left upper arm', 'left', 'upper_arms', 211),
  ('right_upper_arm', 'Right upper arm', 'right', 'upper_arms', 212),
  ('left_elbow', 'Left elbow', 'left', 'elbows', 221),
  ('right_elbow', 'Right elbow', 'right', 'elbows', 222),
  ('left_forearm_hand', 'Left forearm and hand', 'left', 'forearms_hands', 231),
  ('right_forearm_hand', 'Right forearm and hand', 'right', 'forearms_hands', 232),
  ('left_hip', 'Left hip', 'left', 'hips', 241),
  ('right_hip', 'Right hip', 'right', 'hips', 242),
  ('left_thigh', 'Left thigh', 'left', 'thighs', 251),
  ('right_thigh', 'Right thigh', 'right', 'thighs', 252),
  ('left_knee', 'Left knee', 'left', 'knees', 261),
  ('right_knee', 'Right knee', 'right', 'knees', 262),
  ('left_lower_leg', 'Left lower leg', 'left', 'lower_legs', 271),
  ('right_lower_leg', 'Right lower leg', 'right', 'lower_legs', 272),
  ('left_ankle_foot', 'Left ankle and foot', 'left', 'ankles_feet', 281),
  ('right_ankle_foot', 'Right ankle and foot', 'right', 'ankles_feet', 282)
on conflict (id) do update set label = excluded.label, parent_id = excluded.parent_id, sort_order = excluded.sort_order;

insert into public.capabilities (id, label, sort_order)
values
  ('seated_posture', 'Seated posture', 10),
  ('standing', 'Standing', 20),
  ('standing_balance', 'Standing balance', 30),
  ('floor_transfer', 'Floor transfer', 40),
  ('supine', 'Supine position', 50),
  ('prone', 'Prone position', 60),
  ('kneeling', 'Kneeling', 70),
  ('jumping', 'Jumping', 80),
  ('high_impact', 'High impact movement', 90),
  ('overhead_reach', 'Overhead reach', 100),
  ('forward_bend', 'Forward bend', 110),
  ('torso_rotation', 'Torso rotation', 120),
  ('left_grip', 'Left grip', 130),
  ('right_grip', 'Right grip', 140),
  ('left_upper_body_weight_bearing', 'Left upper-body weight bearing', 150),
  ('right_upper_body_weight_bearing', 'Right upper-body weight bearing', 160),
  ('left_lower_body_weight_bearing', 'Left lower-body weight bearing', 170),
  ('right_lower_body_weight_bearing', 'Right lower-body weight bearing', 180),
  ('left_single_leg_balance', 'Left single-leg balance', 190),
  ('right_single_leg_balance', 'Right single-leg balance', 200)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.equipment (id, label, category, sort_order)
values
  ('dumbbells', 'Dumbbells or light hand weights', 'load', 10),
  ('resistance_band', 'Resistance band', 'load', 20),
  ('stable-chair', 'Stable chair', 'support', 30),
  ('wall', 'Clear wall', 'support', 40),
  ('ankle-weight', 'Ankle weight', 'load', 50),
  ('exercise-mat', 'Exercise mat', 'surface', 60),
  ('water-bottles', 'Water bottles as light weights', 'load', 70)
on conflict (id) do update set label = excluded.label, category = excluded.category, sort_order = excluded.sort_order;

insert into public.goals (id, label, sort_order)
values
  ('upper_body', 'Upper-body strength', 10),
  ('lower_body', 'Lower-body strength', 20),
  ('core', 'Core control', 30),
  ('mobility', 'Mobility', 40),
  ('balance', 'Balance and stability', 50),
  ('cardio', 'Aerobic movement', 60),
  ('strength', 'General strength', 70)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.muscle_groups (id, label, sort_order)
values
  ('shoulders', 'Shoulders', 10),
  ('upper_back', 'Upper back', 20),
  ('chest', 'Chest', 30),
  ('arms', 'Arms', 40),
  ('core', 'Core', 50),
  ('glutes', 'Glutes', 60),
  ('quadriceps', 'Quadriceps', 70),
  ('hamstrings', 'Hamstrings', 80),
  ('calves', 'Calves', 90),
  ('ankles_feet', 'Ankles and feet', 100)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.exercise_sources (
  id,
  title,
  publisher,
  url,
  publication_year,
  access_date,
  license_note,
  review_status,
  reviewer_role
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Guidelines on physical activity and sedentary behaviour',
    'World Health Organization',
    'https://www.who.int/publications/i/item/9789240015128',
    2020,
    date '2026-08-14',
    'Reference guidance; exercise content is adapted and reviewed for general wellness.',
    'approved',
    'clinical-content-reviewer'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Physical Activity for People with Disability',
    'Centers for Disease Control and Prevention',
    'https://www.cdc.gov/physical-activity/people-with-disabilities/index.html',
    null,
    date '2026-08-14',
    'Public health reference; not a diagnosis or individualized treatment plan.',
    'approved',
    'clinical-content-reviewer'
  )
on conflict (id) do update set review_status = excluded.review_status, reviewer_role = excluded.reviewer_role;

create temporary table seed_exercise_rows (
  id uuid primary key,
  slug text not null,
  family_key text not null,
  name text not null,
  category text not null,
  position text not null,
  difficulty integer not null,
  default_prescription jsonb not null,
  instructions jsonb not null,
  safety_cues jsonb not null,
  adaptations jsonb not null,
  body_demands jsonb not null,
  capability_demands jsonb not null,
  equipment_options jsonb not null,
  goal_ids jsonb not null,
  muscle_group_id text not null,
  tracking_key text
);

insert into seed_exercise_rows
select
  x.id::uuid,
  x.slug,
  x.family_key,
  x.name,
  x.category,
  x.position,
  x.difficulty,
  x.default_prescription,
  x.instructions,
  x.safety_cues,
  x.adaptations,
  x.body_demands,
  x.capability_demands,
  x.equipment_options,
  x.goal_ids,
  x.muscle_group_id,
  x.tracking_key
from jsonb_to_recordset(
  $$[
    {"id":"00000000-0000-4000-8000-000000000001","slug":"seated-biceps-curl","family_key":"elbow-flexion","name":"Seated biceps curl","category":"strength","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":10,"restSeconds":45},"instructions":["Sit tall with a stable base.","Bend and straighten the elbows slowly.","Return to the starting position without swinging."],"safety_cues":["Keep breathing and use a comfortable range.","Stop for sharp pain, dizziness, or new symptoms."],"adaptations":["Use no load, lighter bottles, or a band.","Work one arm at a time if that is more comfortable."],"body_demands":[{"region_id":"upper_arms","involvement":"primary","demand":"moderate"},{"region_id":"elbows","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true},{"capability_id":"left_grip","demand":"moderate","required":true},{"capability_id":"right_grip","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"dumbbells","mode":"required","or_group":"curl-load"},{"equipment_id":"resistance_band","mode":"required","or_group":"curl-load"}],"goal_ids":["upper_body","strength"],"muscle_group_id":"arms","tracking_key":"seated-biceps-curl-v1"},
    {"id":"00000000-0000-4000-8000-000000000002","slug":"seated-resistance-band-row","family_key":"horizontal-pull","name":"Seated resistance-band row","category":"strength","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":10,"restSeconds":45},"instructions":["Anchor the band safely and sit tall.","Draw the elbows back with control.","Return the hands slowly."],"safety_cues":["Check the band and anchor before each set.","Keep the shoulders relaxed and stop for sharp pain."],"adaptations":["Use a lighter band or reduce the reach.","Perform a shorter set with more rest."],"body_demands":[{"region_id":"upper_back","involvement":"primary","demand":"high"},{"region_id":"shoulders","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true},{"capability_id":"left_grip","demand":"moderate","required":true},{"capability_id":"right_grip","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"resistance_band","mode":"required"}],"goal_ids":["upper_body","strength"],"muscle_group_id":"upper_back","tracking_key":"seated-resistance-band-row-v1"},
    {"id":"00000000-0000-4000-8000-000000000003","slug":"seated-march","family_key":"hip-flexion","name":"Seated march","category":"cardio","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":20,"restSeconds":30},"instructions":["Sit with both feet supported or ready to move.","Lift one knee and then the other at a steady pace.","Keep the trunk as steady as comfortable."],"safety_cues":["Use back support if needed.","Slow down if breathing becomes uncomfortable or balance changes."],"adaptations":["Use smaller lifts or alternate only one side.","Pause between sides or use hand support."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"moderate"},{"region_id":"thighs","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true}],"equipment_options":[],"goal_ids":["lower_body","cardio"],"muscle_group_id":"quadriceps","tracking_key":"seated-march-v1"},
    {"id":"00000000-0000-4000-8000-000000000004","slug":"seated-knee-extension","family_key":"knee-extension","name":"Seated knee extension","category":"strength","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":10,"restSeconds":45},"instructions":["Sit with the thigh supported.","Straighten one knee to a comfortable height.","Lower the foot slowly and alternate as planned."],"safety_cues":["Do not force the end of the range.","Stop for sharp pain or swelling that is new or worsening."],"adaptations":["Use a shorter range or fewer repetitions.","Add an ankle weight only when it is comfortable and available."],"body_demands":[{"region_id":"knees","involvement":"primary","demand":"high"},{"region_id":"thighs","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"ankle-weight","mode":"optional"}],"goal_ids":["lower_body","strength"],"muscle_group_id":"quadriceps","tracking_key":"seated-knee-extension-v1"},
    {"id":"00000000-0000-4000-8000-000000000005","slug":"sit-to-stand","family_key":"squat-pattern","name":"Sit-to-stand","category":"strength","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Use a stable chair with space around it.","Lean forward slightly and rise with control.","Reach back and sit slowly."],"safety_cues":["Keep the chair from sliding and use support as needed.","Stop for dizziness, loss of balance, or sharp pain."],"adaptations":["Use a higher seat or push from armrests.","Practice a small lift without fully standing."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"high"},{"region_id":"knees","involvement":"primary","demand":"high"}],"capability_demands":[{"capability_id":"standing","demand":"high","required":true},{"capability_id":"left_lower_body_weight_bearing","demand":"high","required":true},{"capability_id":"right_lower_body_weight_bearing","demand":"high","required":true}],"equipment_options":[{"equipment_id":"stable-chair","mode":"required"}],"goal_ids":["lower_body","strength","balance"],"muscle_group_id":"quadriceps","tracking_key":"sit-to-stand-v1"},
    {"id":"00000000-0000-4000-8000-000000000006","slug":"wall-push-up","family_key":"horizontal-push","name":"Wall push-up","category":"strength","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Stand at a clear wall with hands at a comfortable height.","Bend the elbows and bring the body toward the wall.","Press away smoothly."],"safety_cues":["Use a wall that cannot move and keep feet stable.","Stop for shoulder pain, dizziness, or loss of balance."],"adaptations":["Stand closer to make the movement easier.","Use a smaller elbow bend or perform one arm at a time only if stable."],"body_demands":[{"region_id":"shoulders","involvement":"primary","demand":"high"},{"region_id":"upper_arms","involvement":"secondary","demand":"high"}],"capability_demands":[{"capability_id":"standing","demand":"moderate","required":true},{"capability_id":"left_upper_body_weight_bearing","demand":"moderate","required":true},{"capability_id":"right_upper_body_weight_bearing","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"wall","mode":"required"}],"goal_ids":["upper_body","strength"],"muscle_group_id":"chest","tracking_key":"wall-push-up-v1"},
    {"id":"00000000-0000-4000-8000-000000000007","slug":"seated-shoulder-press","family_key":"vertical-push","name":"Seated shoulder press","category":"strength","position":"seated","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Sit tall with a stable base and light load.","Press the hands upward only through a comfortable range.","Lower with control."],"safety_cues":["Do not force an overhead position.","Stop for sharp shoulder pain or new symptoms."],"adaptations":["Use no load or press to eye level.","Use one arm at a time or a band if that is easier to control."],"body_demands":[{"region_id":"shoulders","involvement":"primary","demand":"high"},{"region_id":"upper_arms","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true},{"capability_id":"overhead_reach","demand":"high","required":true},{"capability_id":"left_grip","demand":"moderate","required":true},{"capability_id":"right_grip","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"dumbbells","mode":"required","or_group":"press-load"},{"equipment_id":"resistance_band","mode":"required","or_group":"press-load"}],"goal_ids":["upper_body","strength"],"muscle_group_id":"shoulders"},
    {"id":"00000000-0000-4000-8000-000000000008","slug":"seated-front-raise","family_key":"shoulder-flexion","name":"Seated front raise","category":"strength","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":8,"restSeconds":45},"instructions":["Sit tall with hands relaxed.","Raise the arms forward to a comfortable height.","Lower slowly without swinging."],"safety_cues":["Stay below a painful range.","Use a light load or no load."],"adaptations":["Raise one arm at a time.","Reduce the height and use fewer repetitions."],"body_demands":[{"region_id":"shoulders","involvement":"primary","demand":"moderate"},{"region_id":"upper_arms","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"dumbbells","mode":"optional"}],"goal_ids":["upper_body","strength"],"muscle_group_id":"shoulders"},
    {"id":"00000000-0000-4000-8000-000000000009","slug":"seated-side-reach","family_key":"lateral-reach","name":"Seated side reach","category":"mobility","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":8,"restSeconds":30},"instructions":["Sit with feet supported and hands relaxed.","Reach gently toward one side without collapsing.","Return to center and change sides."],"safety_cues":["Keep the range comfortable and avoid forcing the neck.","Use back support if needed."],"adaptations":["Reach only a small distance or keep one hand supported.","Perform the movement with the arms resting on the thighs."],"body_demands":[{"region_id":"torso","involvement":"primary","demand":"moderate"},{"region_id":"shoulders","involvement":"secondary","demand":"minimal"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true}],"equipment_options":[],"goal_ids":["mobility","core"],"muscle_group_id":"core"},
    {"id":"00000000-0000-4000-8000-000000000010","slug":"seated-torso-rotation","family_key":"torso-rotation","name":"Seated torso rotation","category":"mobility","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":8,"restSeconds":30},"instructions":["Sit tall with the pelvis supported.","Turn the trunk gently to one side.","Return to center and repeat on the other side."],"safety_cues":["Rotate only through a comfortable range.","Do not bounce or force the lower back."],"adaptations":["Keep the movement smaller or move the eyes and shoulders only.","Use a stable back support."],"body_demands":[{"region_id":"torso","involvement":"primary","demand":"moderate"},{"region_id":"lower_back","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true},{"capability_id":"torso_rotation","demand":"moderate","required":true}],"equipment_options":[],"goal_ids":["mobility","core"],"muscle_group_id":"core"},
    {"id":"00000000-0000-4000-8000-000000000011","slug":"seated-heel-raise","family_key":"plantar-flexion","name":"Seated heel raise","category":"strength","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":12,"restSeconds":30},"instructions":["Sit with both feet supported.","Lift the heels while keeping the toes grounded.","Lower the heels slowly."],"safety_cues":["Use a comfortable range and keep the feet aligned.","Stop for cramping or sharp pain."],"adaptations":["Move one foot at a time or make smaller lifts.","Pause at the top only if comfortable."],"body_demands":[{"region_id":"lower_legs","involvement":"primary","demand":"moderate"},{"region_id":"ankles_feet","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"minimal","required":true}],"equipment_options":[],"goal_ids":["lower_body","strength"],"muscle_group_id":"calves"},
    {"id":"00000000-0000-4000-8000-000000000012","slug":"seated-toe-tap","family_key":"ankle-dorsiflexion","name":"Seated toe tap","category":"cardio","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":20,"restSeconds":30},"instructions":["Sit with feet in a comfortable starting position.","Lift and lower the toes at a steady pace.","Keep the heels grounded when possible."],"safety_cues":["Use a slower pace if the movement becomes uncontrolled.","Stop for new pain or cramping."],"adaptations":["Tap one foot at a time or reduce the range.","Use back support and longer rests."],"body_demands":[{"region_id":"ankles_feet","involvement":"primary","demand":"moderate"},{"region_id":"hips","involvement":"secondary","demand":"minimal"}],"capability_demands":[{"capability_id":"seated_posture","demand":"minimal","required":true}],"equipment_options":[],"goal_ids":["lower_body","cardio"],"muscle_group_id":"ankles_feet"},
    {"id":"00000000-0000-4000-8000-000000000013","slug":"standing-supported-hip-abduction","family_key":"hip-abduction","name":"Standing supported hip abduction","category":"strength","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Stand beside a stable support.","Move one leg gently out to the side without leaning.","Return the foot slowly and change sides."],"safety_cues":["Keep one or both hands supported as needed.","Stop if balance changes or pain becomes sharp."],"adaptations":["Reduce the leg range or perform seated side lifts.","Use more support and fewer repetitions."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"high"},{"region_id":"thighs","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"standing","demand":"moderate","required":true},{"capability_id":"standing_balance","demand":"moderate","required":false}],"equipment_options":[{"equipment_id":"stable-chair","mode":"required","or_group":"support"},{"equipment_id":"wall","mode":"required","or_group":"support"}],"goal_ids":["lower_body","balance","strength"],"muscle_group_id":"glutes"},
    {"id":"00000000-0000-4000-8000-000000000014","slug":"standing-supported-hip-extension","family_key":"hip-extension","name":"Standing supported hip extension","category":"strength","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Stand with a stable support within reach.","Move one leg back a small distance without arching the back.","Return to the starting position with control."],"safety_cues":["Keep the pelvis facing forward.","Stop for back pain, balance loss, or sharp pain."],"adaptations":["Use a smaller range or perform a seated glute squeeze.","Add a pause between sides."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"high"},{"region_id":"lower_back","involvement":"stabilizing","demand":"minimal"}],"capability_demands":[{"capability_id":"standing","demand":"moderate","required":true},{"capability_id":"standing_balance","demand":"moderate","required":false}],"equipment_options":[{"equipment_id":"stable-chair","mode":"required","or_group":"support"},{"equipment_id":"wall","mode":"required","or_group":"support"}],"goal_ids":["lower_body","strength"],"muscle_group_id":"glutes"},
    {"id":"00000000-0000-4000-8000-000000000015","slug":"supported-calf-raise","family_key":"standing-plantar-flexion","name":"Supported calf raise","category":"strength","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":10,"restSeconds":60},"instructions":["Stand with both hands near a stable support.","Rise onto the balls of the feet as comfortable.","Lower slowly and pause before repeating."],"safety_cues":["Keep the support close and feet aligned.","Stop if balance or pain worsens."],"adaptations":["Perform seated heel raises.","Use a smaller lift or alternate sides."],"body_demands":[{"region_id":"lower_legs","involvement":"primary","demand":"high"},{"region_id":"ankles_feet","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"standing","demand":"moderate","required":true},{"capability_id":"standing_balance","demand":"moderate","required":false}],"equipment_options":[{"equipment_id":"stable-chair","mode":"required","or_group":"support"},{"equipment_id":"wall","mode":"required","or_group":"support"}],"goal_ids":["lower_body","balance","strength"],"muscle_group_id":"calves"},
    {"id":"00000000-0000-4000-8000-000000000016","slug":"chair-supported-mini-squat","family_key":"supported-squat","name":"Chair-supported mini squat","category":"strength","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Stand in front of a stable chair.","Bend the hips and knees a small amount.","Return to standing with control."],"safety_cues":["Keep the chair close and avoid dropping into the seat.","Stop for sharp knee pain or balance loss."],"adaptations":["Use a higher seat or practice sit-to-stand preparation.","Reduce the depth and use more hand support."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"high"},{"region_id":"knees","involvement":"primary","demand":"high"}],"capability_demands":[{"capability_id":"standing","demand":"high","required":true},{"capability_id":"left_lower_body_weight_bearing","demand":"moderate","required":true},{"capability_id":"right_lower_body_weight_bearing","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"stable-chair","mode":"required"}],"goal_ids":["lower_body","strength"],"muscle_group_id":"quadriceps"},
    {"id":"00000000-0000-4000-8000-000000000017","slug":"wall-shoulder-slide","family_key":"scapular-mobility","name":"Wall shoulder slide","category":"mobility","position":"standing","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":45},"instructions":["Stand with the back or hands near a clear wall as comfortable.","Slide the arms upward through a comfortable range.","Return slowly and relax the shoulders."],"safety_cues":["Do not force the arms overhead.","Keep the wall stable and stop for sharp pain."],"adaptations":["Perform the slide seated or with a smaller range.","Move one arm at a time."],"body_demands":[{"region_id":"shoulders","involvement":"primary","demand":"moderate"},{"region_id":"upper_back","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"standing","demand":"moderate","required":true},{"capability_id":"overhead_reach","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"wall","mode":"required"}],"goal_ids":["upper_body","mobility"],"muscle_group_id":"shoulders"},
    {"id":"00000000-0000-4000-8000-000000000018","slug":"seated-band-chest-press","family_key":"horizontal-push","name":"Seated resistance-band chest press","category":"strength","position":"seated","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Sit tall and anchor the band safely behind you.","Press the hands forward with control.","Return slowly without letting the band snap."],"safety_cues":["Inspect the band and anchor before use.","Stop for shoulder pain or loss of control."],"adaptations":["Use a lighter band or shorter range.","Press one side at a time if that improves control."],"body_demands":[{"region_id":"shoulders","involvement":"primary","demand":"moderate"},{"region_id":"upper_arms","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"seated_posture","demand":"moderate","required":true},{"capability_id":"left_grip","demand":"moderate","required":true},{"capability_id":"right_grip","demand":"moderate","required":true}],"equipment_options":[{"equipment_id":"resistance_band","mode":"required"}],"goal_ids":["upper_body","strength"],"muscle_group_id":"chest"},
    {"id":"00000000-0000-4000-8000-000000000019","slug":"seated-ankle-pump","family_key":"ankle-pump","name":"Seated ankle pump","category":"mobility","position":"seated","difficulty":1,"default_prescription":{"sets":2,"reps":20,"restSeconds":30},"instructions":["Sit with the legs supported.","Point and flex the ankles slowly.","Repeat at a comfortable rhythm."],"safety_cues":["Keep the movement gentle.","Stop for new pain, cramping, or unexpected symptoms."],"adaptations":["Move one ankle at a time or use a smaller range.","Add a pause between sides."],"body_demands":[{"region_id":"ankles_feet","involvement":"primary","demand":"minimal"},{"region_id":"lower_legs","involvement":"secondary","demand":"minimal"}],"capability_demands":[{"capability_id":"seated_posture","demand":"minimal","required":true}],"equipment_options":[],"goal_ids":["lower_body","mobility"],"muscle_group_id":"ankles_feet"},
    {"id":"00000000-0000-4000-8000-000000000020","slug":"seated-glute-squeeze","family_key":"hip-isometric","name":"Seated glute squeeze","category":"strength","position":"seated","difficulty":1,"default_prescription":{"sets":2,"holdSeconds":5,"restSeconds":30},"instructions":["Sit with the pelvis supported.","Gently contract the glute muscles.","Hold briefly, release, and breathe normally."],"safety_cues":["Keep the breath relaxed.","Stop if the position causes new pain."],"adaptations":["Use shorter holds or fewer repetitions.","Perform lying down only if that position is safe and available."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"moderate"},{"region_id":"thighs","involvement":"secondary","demand":"minimal"}],"capability_demands":[{"capability_id":"seated_posture","demand":"minimal","required":true}],"equipment_options":[],"goal_ids":["lower_body","strength"],"muscle_group_id":"glutes"},
    {"id":"00000000-0000-4000-8000-000000000021","slug":"supine-heel-slide","family_key":"supine-knee-flexion","name":"Supine heel slide","category":"mobility","position":"floor","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":45},"instructions":["Lie on the back with a supported surface.","Slide one heel toward the body through a comfortable range.","Slide it away slowly and change sides."],"safety_cues":["Use a clear, supportive surface and a safe transfer plan.","Stop for sharp pain, dizziness, or breathing difficulty."],"adaptations":["Use a smaller range or a strap only if it is safe.","Perform seated knee slides instead."],"body_demands":[{"region_id":"knees","involvement":"primary","demand":"moderate"},{"region_id":"hips","involvement":"secondary","demand":"moderate"}],"capability_demands":[{"capability_id":"supine","demand":"moderate","required":true},{"capability_id":"floor_transfer","demand":"high","required":true}],"equipment_options":[{"equipment_id":"exercise-mat","mode":"optional"}],"goal_ids":["lower_body","mobility"],"muscle_group_id":"quadriceps"},
    {"id":"00000000-0000-4000-8000-000000000022","slug":"supine-bridge","family_key":"hip-extension-floor","name":"Supine bridge","category":"strength","position":"floor","difficulty":3,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Lie on the back with feet supported and knees comfortable.","Lift the pelvis a small amount while breathing.","Lower slowly and rest between repetitions."],"safety_cues":["Use a stable surface and safe transfer plan.","Do not force the back or hold the breath."],"adaptations":["Practice a small pelvic lift or seated glute squeeze.","Use fewer repetitions and longer rests."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"high"},{"region_id":"lower_back","involvement":"stabilizing","demand":"moderate"}],"capability_demands":[{"capability_id":"supine","demand":"moderate","required":true},{"capability_id":"floor_transfer","demand":"high","required":true}],"equipment_options":[{"equipment_id":"exercise-mat","mode":"optional"}],"goal_ids":["lower_body","core","strength"],"muscle_group_id":"glutes"},
    {"id":"00000000-0000-4000-8000-000000000023","slug":"side-lying-clamshell","family_key":"hip-external-rotation","name":"Side-lying clamshell","category":"strength","position":"floor","difficulty":2,"default_prescription":{"sets":2,"reps":8,"restSeconds":45},"instructions":["Lie on one side with the hips and knees comfortably bent.","Open the top knee without rolling the pelvis.","Lower slowly and change sides."],"safety_cues":["Use a supported surface and a safe transfer plan.","Stop for sharp hip, knee, or back pain."],"adaptations":["Use a smaller knee opening or perform a seated hip press.","Use no band or fewer repetitions."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"moderate"},{"region_id":"lower_back","involvement":"stabilizing","demand":"minimal"}],"capability_demands":[{"capability_id":"floor_transfer","demand":"high","required":true}],"equipment_options":[{"equipment_id":"resistance_band","mode":"optional"},{"equipment_id":"exercise-mat","mode":"optional"}],"goal_ids":["lower_body","strength"],"muscle_group_id":"glutes"},
    {"id":"00000000-0000-4000-8000-000000000024","slug":"prone-hip-extension","family_key":"hip-extension-prone","name":"Prone hip extension","category":"strength","position":"floor","difficulty":3,"default_prescription":{"sets":2,"reps":8,"restSeconds":60},"instructions":["Lie on the front only if the position is comfortable and safe.","Lift one leg a small amount without twisting the pelvis.","Lower slowly and change sides."],"safety_cues":["Use a safe transfer plan and keep breathing freely.","Stop for back pain, breathing difficulty, or sharp symptoms."],"adaptations":["Perform standing supported hip extension or a seated glute squeeze.","Use a smaller lift or keep the leg supported."],"body_demands":[{"region_id":"hips","involvement":"primary","demand":"high"},{"region_id":"lower_back","involvement":"stabilizing","demand":"moderate"}],"capability_demands":[{"capability_id":"prone","demand":"high","required":true},{"capability_id":"floor_transfer","demand":"high","required":true}],"equipment_options":[{"equipment_id":"exercise-mat","mode":"optional"}],"goal_ids":["lower_body","strength"],"muscle_group_id":"glutes"}
  ]$$::jsonb
) as x(
  id text,
  slug text,
  family_key text,
  name text,
  category text,
  position text,
  difficulty integer,
  default_prescription jsonb,
  instructions jsonb,
  safety_cues jsonb,
  adaptations jsonb,
  body_demands jsonb,
  capability_demands jsonb,
  equipment_options jsonb,
  goal_ids jsonb,
  muscle_group_id text,
  tracking_key text
);

insert into public.exercises (
  id,
  slug,
  family_key,
  name,
  summary,
  category,
  position,
  difficulty,
  default_prescription,
  instructions,
  safety_cues,
  adaptations,
  active,
  content_version
)
select
  id,
  slug,
  family_key,
  name,
  'General-wellness movement with adjustable range, load, pace, and support.',
  category,
  position,
  difficulty,
  default_prescription,
  instructions,
  safety_cues,
  adaptations,
  false,
  1
from seed_exercise_rows
on conflict (id) do update set
  name = excluded.name,
  summary = excluded.summary,
  default_prescription = excluded.default_prescription,
  instructions = excluded.instructions,
  safety_cues = excluded.safety_cues,
  adaptations = excluded.adaptations,
  content_version = excluded.content_version;

insert into public.exercise_body_demands (exercise_id, body_region_id, involvement, demand)
select e.id, demand ->> 'region_id', demand ->> 'involvement', demand ->> 'demand'
from seed_exercise_rows e
cross join lateral jsonb_array_elements(e.body_demands) as demand
on conflict (exercise_id, body_region_id) do update set
  involvement = excluded.involvement,
  demand = excluded.demand;

insert into public.exercise_capability_demands (exercise_id, capability_id, demand, required)
select e.id, demand ->> 'capability_id', demand ->> 'demand', (demand ->> 'required')::boolean
from seed_exercise_rows e
cross join lateral jsonb_array_elements(e.capability_demands) as demand
on conflict (exercise_id, capability_id) do update set
  demand = excluded.demand,
  required = excluded.required;

insert into public.exercise_equipment_options (exercise_id, equipment_id, mode, or_group)
select e.id, option ->> 'equipment_id', option ->> 'mode', option ->> 'or_group'
from seed_exercise_rows e
cross join lateral jsonb_array_elements(e.equipment_options) as option
on conflict (exercise_id, equipment_id) do update set
  mode = excluded.mode,
  or_group = excluded.or_group;

insert into public.exercise_goals (exercise_id, goal_id)
select e.id, goal_id
from seed_exercise_rows e
cross join lateral jsonb_array_elements_text(e.goal_ids) as goal_id
on conflict (exercise_id, goal_id) do nothing;

insert into public.exercise_muscles (exercise_id, muscle_group_id, role, intensity)
select id, muscle_group_id, 'primary', greatest(1, least(5, difficulty + 1))
from seed_exercise_rows
on conflict (exercise_id, muscle_group_id) do update set intensity = excluded.intensity;

insert into public.exercise_tracking_profiles (
  exercise_id,
  tracking_key,
  version,
  confidence_floor,
  range_of_motion_target,
  tempo_target,
  supported_metrics
)
select
  id,
  tracking_key,
  1,
  0.600,
  '{"minDeg":30,"maxDeg":140}'::jsonb,
  '{"minSeconds":2,"maxSeconds":6}'::jsonb,
  '{"rangeOfMotion":true,"targetPosition":true,"accuracy":true,"control":true,"stability":true,"tempo":true}'::jsonb
from seed_exercise_rows
where tracking_key is not null
on conflict (exercise_id) do update set
  tracking_key = excluded.tracking_key,
  version = excluded.version,
  confidence_floor = excluded.confidence_floor;

insert into public.exercise_form_rules (
  tracking_profile_id,
  feedback_code,
  metric_name,
  comparison,
  threshold,
  severity,
  message_key
)
select exercise_id, 'low_tracking_confidence', 'trackingConfidence', 'lt', 0.600, 'warning', 'tracking.confidence.low'
from public.exercise_tracking_profiles
on conflict (tracking_profile_id, feedback_code) do update set threshold = excluded.threshold;

insert into public.exercise_form_rules (
  tracking_profile_id,
  feedback_code,
  metric_name,
  comparison,
  threshold,
  severity,
  message_key
)
select exercise_id, 'tempo_too_slow', 'durationMs', 'gt', 6000, 'info', 'tempo.slow'
from public.exercise_tracking_profiles
on conflict (tracking_profile_id, feedback_code) do update set threshold = excluded.threshold;

insert into public.exercise_source_links (exercise_id, source_id)
select e.id, s.id
from public.exercises e
cross join public.exercise_sources s
where s.id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
)
on conflict (exercise_id, source_id) do nothing;

update public.exercises
set active = true
where id in (select id from seed_exercise_rows);

drop table seed_exercise_rows;
