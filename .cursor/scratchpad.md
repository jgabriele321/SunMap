# SunMap Granularity Enhancement Plan

## Background and Motivation

The current SunMap displays sunset time variations at the **state level** (50 states + DC). The user wants a **more granular** visualization that shows finer geographic detail while:
1. Maintaining the visual fidelity of the US map shape
2. Avoiding gaps in the visualization
3. Keeping reasonable performance

## Key Challenges and Analysis

### Option 1: County-Level Map
**Pros:**
- ~3,200 counties provides much finer detail
- Counties follow actual administrative boundaries (no gaps)
- us-atlas provides `counties-10m.json` (unprojected, same as states)

**Cons:**
- 60x more polygons to render and compute
- Need county-level FIPS to timezone mapping
- SVG performance with 3000+ paths may be slow on mobile

### Option 2: Grid-Based Overlay
**Pros:**
- Arbitrary granularity (e.g., 0.5° lat/lon grid = ~2500 cells)
- Simple to implement - just sample points
- Easy to adjust density

**Cons:**
- Grid cells don't follow state/coastline boundaries (gaps or overflows)
- Need to clip grid to US boundary
- Less "natural" looking

### Option 3: Voronoi/Hexbin Approach
**Pros:**
- Interesting visual style
- Can control point density

**Cons:**
- More complex implementation
- May look unfamiliar to users

### Recommended Approach: County-Level Map

Counties are the natural next step - they're real geographic units, us-atlas already provides the data, and the centroid/timezone approach works identically. Key implementation:

1. Use `us-atlas/counties-10m.json` (unprojected TopoJSON)
2. Compute centroid for each county → lookup timezone
3. Compute sunset for each county
4. Color by delta from national average
5. Optimize rendering:
   - Use `<canvas>` instead of SVG paths for better performance
   - Or use SVG with optimized path rendering (memo paths, reduce re-renders)
   - Consider web workers for computation

## High-level Task Breakdown

### Task 1: Add County Data Loading
- [ ] Import `us-atlas/counties-10m.json`
- [ ] Create county-to-name mapping (FIPS codes)
- [ ] Compute centroids and timezones for each county
- **Success criteria:** Console logs showing ~3200 counties with valid centroids/timezones

### Task 2: Create Toggle for State vs County View
- [ ] Add UI toggle: "State" | "County" mode
- [ ] State-level view remains default
- [ ] County view uses county features instead
- **Success criteria:** Toggle switches between state and county map data

### Task 3: Optimize Rendering for 3000+ Polygons
- [ ] Memoize path generation to avoid recomputation
- [ ] Consider using `<canvas>` renderer for county view
- [ ] Test performance on county view
- **Success criteria:** Smooth slider interaction with county view (no lag)

### Task 4: Update Tooltip for Counties
- [ ] Show county name + state name
- [ ] Same sunset info (time, delta, timezone)
- **Success criteria:** Hovering counties shows proper county/state names

### Task 5: Polish and Test
- [ ] Test edge dates (day 1, 365)
- [ ] Test Alaska/Hawaii counties
- [ ] Verify no gaps in visualization
- **Success criteria:** Complete county map with all acceptance criteria met

## Project Status Board

- [x] Initial app implementation
- [x] Bug fix: polar day handling for Alaska
- [x] Push to GitHub
- [ ] Task 1: Add County Data Loading
- [ ] Task 2: Create Toggle for State vs County View
- [ ] Task 3: Optimize Rendering
- [ ] Task 4: Update Tooltip for Counties
- [ ] Task 5: Polish and Test

## Executor's Feedback or Assistance Requests

*Ready to begin Task 1 upon approval.*

## Lessons

1. **Polar day edge case**: Alaska in summer may have sunset on a different calendar day (or no sunset). Must validate that sunset date matches requested date before computing minutes-after-midnight.

2. **us-atlas unprojected vs projected**: Use `states-10m.json` or `counties-10m.json` (unprojected) for centroid calculation, NOT the `-albers` versions which are pre-projected.

