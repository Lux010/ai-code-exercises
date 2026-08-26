# Exercise 2 — Algorithm Deconstruction Challenge (JavaScript)

**Chosen algorithm:** *Algorithm 3 — Task List Merging (Two-Way Sync)*
(`use-cases/code-algorithms/javascript/TaskManager/task_list_merge.js`)

> The other two algorithms (priority scoring, text parser) are deconstructed in the
> supplementary `ALGORITHMS.md`. This document follows the exercise format: break the
> algorithm down with the "Deciphering Complex Functions and Algorithms" prompts, document
> the understanding with diagrams, capture learning points, and answer the reflection
> questions.

---

## 1. Breaking it down with the AI prompts

### Prompt used (deciphering a complex function)
> "I'm trying to understand `mergeTaskLists(localTasks, remoteTasks)` and its helper
> `resolveTaskConflict`. Act like a patient mentor: (1) state the problem it solves in one
> sentence, (2) list the distinct cases it handles, (3) explain the conflict-resolution
> rules step by step, (4) point out the subtle parts a reader misses, and (5) give me a
> small worked example."

### AI's explanation (recorded)
- **Problem:** combine two id-keyed maps of tasks (local & remote) into one consistent set
  *and* report what must be written back to each side so both stay in sync — classic
  offline two-way merge / sync.
- **Three cases** by task id:
  1. *Local only* → copy to merged, flag `toCreateRemote`.
  2. *Remote only* → copy to merged, flag `toCreateLocal`.
  3. *Both* → call `resolveTaskConflict`, then flag `toUpdateLocal`/`toUpdateRemote` per its
     return tuple.
- **Conflict rules (per task present in both):**
  - Start from a **copy of local** as the base.
  - *Field wins by recency*: if `remote.updatedAt` is newer, copy `title/description/
    priority/dueDate` from remote into merged and set `shouldUpdateLocal`.
  - *Completed wins*: a DONE side overrides a non-DONE side for `status`/`completedAt`
    (even if the non-DONE side is newer).
  - *Tags*: union of both sets; if the union differs from either side, flag that side.
  - `updatedAt` set to the latest of the two.
- **Subtle parts:** (a) the base is local, so "local newer" keeps local fields and only
  flags `shouldUpdateRemote`; (b) last-writer-wins can lose *concurrent* edits to different
  fields; (c) `arraysEqual` sorts before comparing, so tag order doesn't matter.

### Worked example (from the AI)
```
local  = { a: {title:'Draft',  status:'todo', updatedAt:'2023-01-01', tags:['x']} }
remote = { a: {title:'Final',  status:'done', updatedAt:'2023-02-01', tags:['y']} }

resolveTaskConflict:
  base = local copy
  remote newer → title='Final' (shouldUpdateLocal=true)
  remote DONE & local not → status='done', completedAt=remote's (shouldUpdateLocal=true)
  tags union = ['x','y'] → differs from both → updateLocal AND updateRemote
  merged.updatedAt = 2023-02-01
→ mergedTasks.a = {title:'Final', status:'done', tags:['x','y'], updatedAt:'2023-02-01'}
→ toUpdateLocal.a = merged ; toUpdateRemote.a = merged
```

---

## 2. Documented understanding (with diagrams)

### Case flow
```
                 allTaskIds = union(localIds, remoteIds)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   local only            remote only            both present
        │                     │                     │
 toCreateRemote        toCreateLocal        resolveTaskConflict
        │                     │           ┌───────────┼───────────┐
   merged = local        merged = remote  │ fields: newer wins   │
                              │           │ status: DONE wins    │
                              │           │ tags: union          │
                              │           │ updatedAt: latest    │
                              │           └───────────┬───────────┘
                              │                 toUpdateLocal? / toUpdateRemote?
                              ▼                     ▼
                   return { mergedTasks, toCreateRemote, toUpdateRemote,
                            toCreateLocal, toUpdateLocal }
```

### Conflict-resolution decision table (for a task in both)
| Condition | Action | Flag |
|-----------|--------|------|
| `remote.updatedAt` > `local.updatedAt` | copy remote scalar fields into merged | `updateLocal` |
| otherwise | keep local fields | `updateRemote` |
| remote DONE, local not | take remote status+completedAt | `updateLocal` |
| local DONE, remote not | keep local status | `updateRemote` |
| different non-DONE status | newer wins | per recency |
| tag union ≠ local tags | — | `updateLocal` |
| tag union ≠ remote tags | — | `updateRemote` |

### Data structures
- Inputs/outputs: plain objects keyed by `taskId` (effectively `Map<id, Task>`).
- Output deltas: four partial maps (`toCreateRemote`, `toUpdateRemote`, `toCreateLocal`,
  `toUpdateLocal`) that a sync layer would push to each store.

---

## 3. Insights & learning points
- **Two-way sync ≠ simple merge.** You must return *what changed on each side*, not just the
  merged result, or nothing can be persisted back.
- **Last-writer-wins (LWW)** is simple but **lossy**: if I edit the title locally and you
  edit the priority remotely, the newer edit silently discards the older one's field — even
  though they don't conflict. Field-level merge would be safer.
- **Special-case rules break symmetry.** "Completed wins" is a deliberate business rule that
  overrides the recency rule; spotting these is the hard part of reading sync code.
- **Tag union** is a nice touch: sets merge cleanly, and the symmetric "update both if
  changed" keeps both replicas consistent.
- **Copy-first, mutate** (`{...localTask}`) avoids mutating the caller's objects — good
  hygiene.

---

## 4. Reflection questions

**Q1. How did the AI's explanation change your understanding of the algorithm?**
I initially read it as "just merge two dictionaries." The explanation made me see it's a
*sync* algorithm whose real output is the four delta maps, and that the interesting logic
is entirely in `resolveTaskConflict`'s precedence rules (recency vs. completed-status vs.
tag union). I also hadn't noticed the local-copy base means "local newer" implies only a
remote write-back.

**Q2. What aspects were still difficult to understand after the AI explanation?**
The *concurrency semantics* — what actually happens when both sides edited *different*
fields. The code applies LWW per status but copies all scalar fields wholesale from the
newer side, so an older-side edit to a non-status field is lost without any flag. That
asymmetry took a worked example to fully grasp, and I'd still want to trace it with a unit
test to be certain.

**Q3. How would you explain this algorithm to a junior developer?**
"Imagine two notepads with the same list of tasks, and you've both ticked/deleted things
while offline. For each task id we do one of three things: only on my notepad → add it to
yours; only on yours → add it to mine; on both → compare. When both changed, the more
recently-edited version usually wins, except a *completed* task always wins. Then we glue
the tags from both together. At the end we hand you two shopping lists: 'create these
remotely' and 'update these remotely' (and the mirror for me)."

**Q4. Did you test this understanding against AI?**
Yes — I wrote the worked example above and ran it past the explanation, then **verified it
with code**: `tests/task_list_merge.test.js` (added in the Testing exercise) asserts the
"newer remote wins", "completed wins", and "tag union" behaviours, and all pass. The tests
acted as the ground truth that confirmed my mental model.

**Q5. How might you improve the algorithm based on your understanding?**
- **Field-level merge** instead of copying all scalar fields from the newer side — keep
  local edits to fields the remote didn't touch (fixes the lost-edit problem in Q2).
- **Conflict reporting**: when both sides changed the *same* field, return a `conflicts`
  list so the UI can prompt the user instead of silently LWW.
- **Deterministic tie-break** when `updatedAt` is equal (currently "local wins" implicitly).
- **Avoid `arraysEqual` sort** (O(k log k)); a `Set` compare is simpler and allocation-light.
- **Optimize**: skip `resolveTaskConflict` entirely when `updatedAt` and a hash of both
  tasks are equal (no-op sync).
