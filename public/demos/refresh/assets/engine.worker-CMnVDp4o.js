var e=`"""SpaceShift shared contracts. This file is the source of truth; schema.ts mirrors it.

Coordinate conventions (all services and the editor MUST agree on these):

- Units are metres. Right-handed, Y-up: X = width, Y = height (Y=0 is the floor), Z = depth.
- Plan view is looking down -Y from above. On screen +X points right and -Z points up,
  so +Z points down the page.
- Furniture yaw (\`Pose2D.yaw_deg\`): rotation about +Y, counter-clockwise when viewed from above
  (the right-hand rule, identical to Three.js \`rotation.y = yaw_deg * PI / 180\`).
  The item's front direction is (sin(yaw), 0, cos(yaw)):
  yaw 0 = front faces +Z, 90 = +X, 180 = -Z, 270 = -X.
- Plan bearings (\`WindowOpening.plan_normal_deg\`, \`RoomScene.north_compass_deg\`) use a DIFFERENT,
  compass-style convention: clockwise from -Z when viewed from above. Direction is
  (sin(b), 0, -cos(b)): 0 = -Z ("up"), 90 = +X, 180 = +Z, 270 = -X.
  Convert between them with: bearing = (180 - yaw) mod 360.
- True compass azimuth of any plan bearing b: azimuth = (b - north) mod 360, where
  north = \`RoomScene.north_compass_deg\`, or 0 when it is None (fallback: -Z is North, and
  \`AuditReport.glare_orientation_grounded\` is False when that fallback is assessed;
  it is None when glare is not assessed).
- Every furniture .glb has its bounding-box bottom-centre at the origin and its front facing +Z.
  \`Pose2D.x/z\` is where that bottom-centre sits in room coordinates; Y is currently always 0
  (on the floor).
  \`bbox_m\` is authoritative: the mesh is scaled to fit it and its bounds match \`bbox_m\` within
  GLB_BBOX_TOLERANCE_M per axis (see \`FurnitureItem.glb_url\`).
- \`floor_polygon\` is a simple (non-self-intersecting) polygon wound clockwise in plan view
  (+X right, +Z down the page). Equivalently, its shoelace sum over (x, z),
  sum(x[i] * z[i+1] - x[i+1] * z[i]), is positive. Walls run start -> end in the same direction,
  so for a wall direction d = (dx, dz) the room is on the (-dz, dx) side and the outward normal is
  (dz, -dx). This holds for non-convex (e.g. L-shaped) rooms.
- Wall \`start\`/\`end\` lie on the wall's interior (room-side) face. The wall's thickness extends
  along the outward normal. So \`floor_polygon\` is the usable interior floor and an item flush
  against a wall has its back exactly on the wall line.
- The shell .glb (\`RoomScene.shell_glb_url\`) is NOT normalised like furniture: it is authored in
  room coordinates with identity transforms, with the floor's top surface at Y=0. It is derived
  from \`floor_polygon\`/\`walls\`/\`windows\`/\`doors\`, which stay authoritative; the audit never reads
  it. It contains one node per element, named \`floor\`, \`ceiling\` and \`wall_<wall_id>\`. Viewers
  hide \`ceiling\` whenever the camera is above it (plan and orbit views, renders from above).

Occupied volume and collision (the editor preview and the audit MUST agree on these):

- \`FurnitureItem.collision_parts\` lists boxes in the item's local frame. An empty list means
  one solid box filling \`bbox_m\`. Every part lies inside \`bbox_m\` (tolerance
  GLB_BBOX_TOLERANCE_M).
- Parts rotate with the item's yaw, so each stays a vertical prism: a rotated rectangle in
  plan with a height range [y_min, y_max].
- Two items collide when some part of one and some part of the other overlap in plan by more
  than MIN_PLAN_OVERLAP_M2 and in height by more than MIN_HEIGHT_OVERLAP_M. Touching is not a
  collision. Test \`bbox_m\` footprints first as a broad phase.
- \`CollisionIssue.overlap_area_m2\` is the plan area of the union of overlapping part pairs.
- Walkable floor is blocked by any part whose y_min is below WALK_HEADROOM_M.
- A door leaf and a sun ray test against the parts in their height range.
- \`is_fixed\` items take part in every check but are never moved by the editor or the solver.
- A chair never blocks another item's \`requires_front_clear_m\` zone: it is pushed in or out
  in use (e.g. tucked under a desk).

Room inputs and scale (see \`RoomCaptureInputs\`):

- A room is captured from 1..MAX_FLOOR_PLAN_IMAGES floor-plan images and 1..MAX_ROOM_VIDEOS
  videos.
- Metric scale comes from the dimension labels printed on the floor plan. Labelled lengths are
  read directly and the remaining walls are scaled from them; geometry sized this way is
  \`dimension_source = "measured"\`. Without readable labels, sizes are \`estimated\` and
  \`"dimensions"\` is added to \`correction_needed\`.
"""

from typing import Annotated, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

GLB_BBOX_TOLERANCE_M = 0.001
"""Maximum per-axis difference between a furniture mesh's bounds and its \`bbox_m\`."""

# An absolute http(s) URL or a site-root path; rejects relative and protocol-relative ("//") paths.
GLB_URL_PATTERN = r"^(https?://|/[^/])"

# Opaque and URL-safe. No code may parse meaning out of an item ID.
ITEM_ID_PATTERN = r"^[a-z0-9][a-z0-9_-]{0,63}$"

MAX_COLLISION_PARTS = 12
MIN_PART_DIMENSION_M = 0.01
MIN_PLAN_OVERLAP_M2 = 0.0001
"""Two parts overlap in plan only when their intersection exceeds this area (1 cm^2)."""
MIN_HEIGHT_OVERLAP_M = 0.005
"""Two parts overlap in height only when their ranges share more than this."""
WALK_HEADROOM_M = 2.0
"""A part whose y_min is below this blocks the floor beneath it for walking."""

MAX_LAYOUT_INSTRUCTION_CHARS = 500

LayoutGoal = Literal["balanced", "brighter", "roomier", "minimal_changes", "feng_shui", "custom"]
"""What a layout suggestion should favour once it fits and doors are clear. \`balanced\`: access
in front of furniture, then walking space. \`brighter\`: unobstructed windows first. \`roomier\`:
walking space first. \`minimal_changes\`: move furniture only to fix a fit or access problem.
\`feng_shui\`: raise the full-rule score from \`/feng-shui/score\`, using the Feng Shui skill.
\`custom\`: the request is something else (e.g. "a cosy reading corner"); the assistant
follows the user's wording and only fit, doors and access are checked, so the user judges
the rest in the preview."""

MAX_FLOOR_PLAN_IMAGES = 5
MAX_ROOM_VIDEOS = 5
MediaUrl = Annotated[str, Field(pattern=GLB_URL_PATTERN)]


class ContractModel(BaseModel):
    # Publish the attribute docstrings below as field descriptions in OpenAPI (/docs).
    model_config = ConfigDict(use_attribute_docstrings=True)


class Vec2(ContractModel):
    """A point on the floor plan (Y omitted)."""

    x: float
    z: float


class Vec3(ContractModel):
    x: float
    y: float
    z: float


class WallSegment(ContractModel):
    id: str = Field(pattern=r"^[A-Za-z0-9_-]+$")
    """Also names the shell node \`wall_<id>\`. Restricted because Three.js strips characters such
    as \`.\`, \`:\` and \`/\` from glTF node names."""
    start: Vec2
    """Interior (room-side) face; thickness extends outward, away from the floor polygon."""
    end: Vec2
    height_m: float = 2.6
    thickness_m: float = 0.15


class WindowOpening(ContractModel):
    id: str
    wall_id: str
    offset_along_wall_m: float
    """Distance from the wall's \`start\` to the near edge of the opening, along the wall."""
    width_m: float
    sill_height_m: float = 0.9
    head_height_m: float = 2.1
    plan_normal_deg: float
    """Outward normal of \`wall_id\` as a plan bearing (clockwise from -Z viewed from above, see
    module doc). Derived: the wall's geometry wins if they disagree."""
    compass_azimuth_deg: Optional[float] = None
    """True compass azimuth (0 = North) = (plan_normal_deg - north_compass_deg) mod 360. Derived:
    \`north_compass_deg\` wins if they disagree. None when the floor plan has no compass."""


class DoorOpening(ContractModel):
    """A hinged door in a wall.

    \`hinge_pos\` lies on the wall's interior-face line. The closed leaf runs along the wall from
    the hinge for \`width_m\`. Opening rotates the leaf about the hinge, clockwise (viewed from
    above) when \`swing_clockwise\` is true, towards the room side when \`swings_into_room\` is true.
    Those two fields decide which way along the wall the closed leaf lies: rotating the
    wall-parallel closed leaf by 90 degrees in the swing direction must point it to the swing side.
    \`swing_angle_deg\` is only how far it opens.
    Example: hinge on a wall running along X with the room on +Z, swinging clockwise into the
    room, means the closed leaf extends toward +X and the leaf at 90 degrees points +Z.
    """

    id: str
    wall_id: str
    hinge_pos: Vec2
    width_m: float = 0.85
    head_height_m: float = 2.05
    swing_angle_deg: float = 90.0
    swing_clockwise: bool = True
    """Direction of opening, viewed from above (plan view, -Z up)."""
    swings_into_room: bool = True
    """False when the door opens outward, away from the floor polygon."""


class BBoxM(ContractModel):
    """Canonical metric bounds in the item's local frame: width along X, height along Y,
    depth along Z (front faces +Z)."""

    width: float
    height: float
    depth: float


class Pose2D(ContractModel):
    """Floor placement of an item's bounding-box bottom-centre. See module doc for yaw."""

    x: float
    z: float
    yaw_deg: float = 0.0
    """Counter-clockwise about +Y viewed from above. Equals Three.js rotation.y (in degrees)."""


class CollisionPart(ContractModel):
    """One box of an item's occupied volume, in the item's local frame (the .glb frame):
    origin at the bounding-box bottom-centre, +Y up, front facing +Z. See module doc."""

    # A NaN would pass every bounds comparison and make the part never collide.
    model_config = ConfigDict(allow_inf_nan=False)

    x: float
    """Centre along X."""
    z: float
    """Centre along Z."""
    width: float
    """Extent along X."""
    depth: float
    """Extent along Z."""
    y_min: float
    """Bottom, metres above the floor."""
    y_max: float
    """Top, metres above the floor."""


class FurnitureItem(ContractModel):
    id: str = Field(pattern=ITEM_ID_PATTERN)
    """Stable across reconstruction, editing, audit and proposals. Never reassigned. Opaque:
    category and source are fields, never parsed out of the ID."""
    name: str
    category: Literal[
        "bed", "desk", "chair", "table", "wardrobe", "sofa", "storage", "fixture", "other"
    ]
    """\`fixture\` is part of the room (e.g. a radiator) and requires \`is_fixed\`."""
    source: Literal["extracted_video", "catalog_search", "url_import"]
    glb_url: str = Field(pattern=GLB_URL_PATTERN)
    """An absolute http(s) URL or a site-root path (e.g. \`/mock_room/bed.glb\`) that the frontend
    fetches as-is. Never a filesystem path or a raw provider (fal) URL: generated meshes are
    downloaded, normalised and re-hosted (by convention: the pattern only rejects relative URLs).
    The file behind a URL is immutable, so replacing a mesh (e.g. a proxy with a real mesh) means a
    new \`glb_url\` on the same \`id\`, and clients may cache by URL. \`bbox_m\` is authoritative: the
    mesh is scaled to fit it, within GLB_BBOX_TOLERANCE_M per axis, so swapping the mesh never
    invalidates an audit."""
    product_url: Optional[str] = None
    price_gbp: Optional[float] = None
    bbox_m: BBoxM
    """Authoritative metric size; the mesh is fitted to it (see \`glb_url\`)."""
    pose: Pose2D
    has_screen: bool = False
    requires_front_clear_m: float = 0.6
    wall_flush_preferred: bool = True
    is_proxy: bool = False
    """True when \`glb_url\` is a dimensioned placeholder box because mesh extraction failed.
    The editor must label proxies visibly."""
    dimension_source: Literal["measured", "catalog", "estimated", "user_corrected"] = "estimated"
    """Provenance of \`bbox_m\`: \`measured\` from the capture, \`catalog\` from retailer-published
    dimensions, \`user_corrected\` by the user, or \`estimated\`. All but \`estimated\` are trusted."""
    correction_needed: List[Literal["dimensions", "placement", "orientation"]] = []
    """What is uncertain and should be confirmed by the user; the editor prompts for each entry."""
    collision_parts: List[CollisionPart] = []
    """Occupied volume as boxes inside \`bbox_m\`, so items can nest (a chair under a desk).
    Empty means one solid box filling \`bbox_m\`. See module doc for the collision rule."""
    collision_source: Literal["template", "mesh", "user_corrected"] = "template"
    """Where \`collision_parts\` came from: a category template fitted to \`bbox_m\`, the mesh, or the
    user. A nested fit that relies on \`template\` parts is an estimate. Ignored when empty."""
    is_fixed: bool = False
    """True when the item is part of the room. The editor does not drag it and the solver does
    not move it; it still takes part in every check."""

    @model_validator(mode="after")
    def _check_collision_parts(self) -> "FurnitureItem":
        if len(self.collision_parts) > MAX_COLLISION_PARTS:
            raise ValueError(f"at most {MAX_COLLISION_PARTS} collision parts per item")
        tol, box = GLB_BBOX_TOLERANCE_M, self.bbox_m
        for i, part in enumerate(self.collision_parts):
            if min(part.width, part.depth, part.y_max - part.y_min) < MIN_PART_DIMENSION_M:
                raise ValueError(f"collision part {i} is thinner than {MIN_PART_DIMENSION_M} m")
            if (
                abs(part.x) + part.width / 2 > box.width / 2 + tol
                or abs(part.z) + part.depth / 2 > box.depth / 2 + tol
                or part.y_min < -tol
                or part.y_max > box.height + tol
            ):
                raise ValueError(f"collision part {i} lies outside bbox_m")
        if self.category == "fixture" and not self.is_fixed:
            raise ValueError("a \`fixture\` item must have is_fixed set")
        return self


class RoomCaptureInputs(ContractModel):
    """What the user uploads for one room. Scale is read from the dimension labels on the floor
    plan (see module doc)."""

    scene_id: str
    floor_plan_image_urls: List[MediaUrl] = Field(min_length=1, max_length=MAX_FLOOR_PLAN_IMAGES)
    """Images of the same floor plan (pages, crops or photos). Same URL rules as \`glb_url\`."""
    video_urls: List[MediaUrl] = Field(min_length=1, max_length=MAX_ROOM_VIDEOS)
    """Walkthrough videos of the room. Same URL rules as \`glb_url\`."""


class RoomScene(ContractModel):
    scene_id: str
    revision: int = Field(default=0, ge=0)
    """Increments on every edit (the editor owns it after load). Services echo the revision they
    computed against so consumers can discard stale responses."""
    shell_glb_url: str = Field(pattern=GLB_URL_PATTERN)
    """Room-coordinate shell derived from the fields below (see module doc for its frame and
    node names). Same URL rules as \`FurnitureItem.glb_url\`."""
    floor_polygon: List[Vec2]
    """Interior floor outline (the walls' room-side faces). Simple polygon, wound clockwise in plan
    view (positive shoelace sum over (x, z)); see module doc."""
    walls: List[WallSegment]
    windows: List[WindowOpening]
    doors: List[DoorOpening]
    furniture: List[FurnitureItem]
    north_compass_deg: Optional[float] = None
    """Plan bearing (clockwise from -Z) at which true North points. Compass azimuth of a plan
    bearing b is (b - north_compass_deg) mod 360. None => -Z is North, glare is ungrounded."""
    sun_hour: float = Field(default=14.0, ge=6.0, le=21.0)

    @model_validator(mode="after")
    def _check_winding(self) -> "RoomScene":
        """floor_polygon is clockwise in plan view and every wall has the room on its (-dz, dx)
        side. Self-intersection is not checked."""
        poly = [(p.x, p.z) for p in self.floor_polygon]
        n = len(poly)
        if n < 3:
            raise ValueError("floor_polygon needs at least 3 points")
        shoelace = sum(poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1] for i in range(n))
        if shoelace <= 0:
            raise ValueError("floor_polygon must be wound clockwise in plan view")

        def inside(x: float, z: float) -> bool:
            hits = False
            for (x0, z0), (x1, z1) in zip(poly, poly[1:] + poly[:1]):
                if (z0 > z) != (z1 > z) and x < x0 + (z - z0) * (x1 - x0) / (z1 - z0):
                    hits = not hits
            return hits

        for w in self.walls:
            dx, dz = w.end.x - w.start.x, w.end.z - w.start.z
            length = (dx * dx + dz * dz) ** 0.5
            mid_x, mid_z = (w.start.x + w.end.x) / 2, (w.start.z + w.end.z) / 2
            if length == 0 or not inside(mid_x - 0.01 * dz / length, mid_z + 0.01 * dx / length):
                raise ValueError(f"wall {w.id} must run with the room on its (-dz, dx) side")
        return self


class ParsedRoom(ContractModel):
    """One room parsed from a floor plan. \`scene\` uses its floor's shared frame (see
    \`ParsedFloor\`), so rooms on the same floor can be shown alone or together."""

    room_id: str = Field(pattern=ITEM_ID_PATTERN)
    """Unique within the plan. Opaque, like item IDs."""
    name: str
    """The printed label (e.g. "Bedroom (4)"), or "Unlabelled space <n>"."""
    labelled_width_m: Optional[float] = None
    """First printed dimension, when a label was read. Plans do not say which axis it is."""
    labelled_depth_m: Optional[float] = None
    """Second printed dimension, when a label was read."""
    area_m2: float
    """Area of \`scene.floor_polygon\`."""
    dimension_source: Literal["measured", "estimated", "user_corrected"]
    """\`measured\` when the floor's scale came from printed dimension labels."""
    correction_needed: List[Literal["dimensions", "openings", "orientation"]] = []
    """What the user should confirm: scale, door/window detection, or north."""
    scene: RoomScene
    """The room with \`furniture == []\`. \`scene.scene_id\` is \`<plan_id>-<room_id>\`."""


class ParsedFloor(ContractModel):
    """One storey. Every room's coordinates share this floor's frame: metres, origin at the
    top-left of the floor's wall bounds, +X right and +Z down the source image."""

    floor_id: str = Field(pattern=ITEM_ID_PATTERN)
    name: str
    """The printed caption (e.g. "First floor"), or "Floor <n>"."""
    level: int
    """0 = ground. Ordered by caption when read, otherwise by position on the sheet."""
    source_image_index: int = Field(ge=0)
    """Index into the uploaded floor-plan images."""
    rooms: List[ParsedRoom]


class ParsedFloorPlan(ContractModel):
    """Every floor and room parsed from 1..MAX_FLOOR_PLAN_IMAGES floor-plan images. The editor
    picks one \`ParsedRoom.scene\` to load."""

    plan_id: str = Field(pattern=ITEM_ID_PATTERN)
    """Derived from the image bytes, so re-uploading the same plan yields the same ID."""
    floors: List[ParsedFloor]
    warnings: List[str] = []
    """Human-readable notes on anything uncertain (unread labels, rejected scale estimates)."""


class CollisionIssue(ContractModel):
    item_a: str
    item_b: str
    overlap_area_m2: float


class BlockedDoorIssue(ContractModel):
    door_id: str
    blocked_by_item_id: str


class ClearanceIssue(ContractModel):
    """An item's required front clearance (\`requires_front_clear_m\`) is not met."""

    item_id: str
    required_m: float
    actual_m: float
    blocked_by_item_id: Optional[str] = None
    """The furniture item in the way, or None when a wall or the room boundary is in the way."""


class GlareAlert(ContractModel):
    item_id: str
    window_id: str
    severity: Literal["none", "warning", "severe"]
    sun_ray_start: Vec3
    sun_ray_end: Vec3


class FengShuiSightline(ContractModel):
    from_item_id: str
    to_door_id: str
    status: Literal["command_position", "back_to_door", "coffin_alignment"]
    reason: str


class FengShuiReport(ContractModel):
    score: int
    sightlines: List[FengShuiSightline]


class AuditReport(ContractModel):
    scene_id: str
    """Echo of the audited RoomScene.scene_id. Required so an un-echoed report fails validation."""
    scene_revision: int = Field(ge=0)
    """Echo of the audited RoomScene.revision. Consumers ignore reports older than their scene."""
    overall_score: Optional[int] = None
    """None means scoring is not implemented/assessed; never interpret it as zero."""
    walkable_floor_ratio: Optional[float] = None
    """Reachable floor fraction for a 0.5 m wide standing person, unioned across all doors.
    None means no entry doors are known. Known but blocked entries produce zero.
    This is distinct from raw unoccupied floor area; see the spatial service README."""
    glare_orientation_grounded: Optional[bool] = None
    """None when glare is not assessed; True for grounded orientation, False only for an
    assessment that used the plan-normal/-Z fallback."""
    collisions: List[CollisionIssue]
    blocked_doors: List[BlockedDoorIssue]
    out_of_bounds_item_ids: List[str] = []
    """Items whose footprint leaves the floor polygon or intersects a wall."""
    clearance_issues: List[ClearanceIssue] = []
    glare_alerts: Optional[List[GlareAlert]] = None
    """None means not assessed; an empty list means assessed with no alerts."""
    feng_shui: Optional[FengShuiReport] = None
    """None means not assessed. Do not manufacture a score for an unavailable assessment."""


class OptimiseRequest(ContractModel):
    scene: RoomScene
    locked_item_ids: List[str] = []
    """Items the optimiser must not move."""
    max_candidates: int = Field(default=200, ge=1)
    """Upper bound on layouts evaluated; the server applies its own lower cap."""
    instruction: Optional[str] = Field(default=None, max_length=MAX_LAYOUT_INSTRUCTION_CHARS)
    """The user's request in their own words, e.g. "keep the bed, move the desk near the
    window". Interpreted by the assistant; it can add locks but never unlock or move fixed items."""
    goal: Optional[LayoutGoal] = None
    """An explicit choice from the UI. It overrides any goal read from \`instruction\`. When both
    are None the goal is \`balanced\`."""


class LayoutProposal(ContractModel):
    """Proposed furniture poses. Only poses change: shell, openings, item IDs and glb_urls are
    preserved. To apply, copy \`poses\` onto matching items, bump the revision and re-audit.

    \`report\` is the audit of the base scene with \`poses\` applied, so \`report.scene_id\` and
    \`report.scene_revision\` identify the base scene (scene_revision == base revision). The
    proposal is stale when the editor's current revision differs from \`report.scene_revision\`.
    Remaining violations are read from \`report\`, not duplicated here.
    """

    proposal_id: str
    poses: Dict[str, Pose2D]
    """item_id -> proposed pose. Items not listed keep their current pose."""
    report: AuditReport
    improved: bool
    """False when no candidate beat the current layout. That is an honest result, not an error.
    When False, \`poses\` is empty and \`report\` audits the unchanged base scene."""
    outcome: Literal["completed", "stopped_early", "assistant_unavailable"] = "completed"
    """\`completed\`: the assistant finished exploring. \`stopped_early\`: a time, call or evaluation
    limit, or an assistant error, cut exploration short; an \`improved\` proposal is still fully
    verified. \`assistant_unavailable\`: the assistant could not be used and nothing was found, so
    \`improved\` is False. Show the last two as such; do not present them as "no better layout"."""
    goal: Optional[LayoutGoal] = None
    """The goal that was applied (explicit, read from the instruction, or \`balanced\`)."""
    explanation: str = ""
    """Plain text for the preview, built by the server from measured results. It also lists
    parts of the instruction that could not be handled."""


LayoutProgressStage = Literal[
    "validating", "interpreting", "exploring", "evaluating", "retrying", "verifying"
]


class LayoutProgress(ContractModel):
    """A factual harness update, never a proposed edit or model reasoning."""

    stage: LayoutProgressStage
    message: str = Field(min_length=1, max_length=300)


class LayoutStreamError(ContractModel):
    message: str = Field(min_length=1, max_length=300)


class LayoutProgressEvent(ContractModel):
    event: Literal["progress"] = "progress"
    data: LayoutProgress


class LayoutResultEvent(ContractModel):
    event: Literal["result"] = "result"
    data: LayoutProposal


class LayoutErrorEvent(ContractModel):
    event: Literal["error"] = "error"
    data: LayoutStreamError


LayoutStreamEvent = LayoutProgressEvent | LayoutResultEvent | LayoutErrorEvent
"""POST /solve/stream SSE: event is the SSE name; data is its JSON payload."""


class ChatRequest(ContractModel):
    """POST /chat and /chat/stream."""

    scene: RoomScene
    instruction: str = Field(min_length=1, max_length=MAX_LAYOUT_INSTRUCTION_CHARS)


class ProductOption(ContractModel):
    """A real retailer product the chat agent found; the editor offers it to add to the room."""

    name: str = Field(min_length=1, max_length=160)
    retailer: str
    product_url: str = Field(pattern=r"^https?://\\S+$", max_length=2000)
    image_url: str = Field(pattern=r"^https?://\\S+$", max_length=2000)
    category: Literal["bed", "desk", "chair", "table", "wardrobe", "sofa", "storage", "other"]
    price_gbp: Optional[float] = None
    bbox_m: Optional[BBoxM] = None
    """What the retailer published, if read; the import measures the delivered mesh."""
    dimensions_text: Optional[str] = None


class ChatReply(ContractModel):
    """POST /chat response, and the data of /chat/stream's terminal \`reply\` event."""

    text: str
    poses: Dict[str, Pose2D] = Field(default_factory=dict)
    additions: List[FurnitureItem] = Field(default_factory=list)
    report: Optional[AuditReport] = None
    proposal: Optional[LayoutProposal] = None
    """Preserve goal/outcome metadata when chat delegates to the rearrangement harness."""
    products: Optional[List[ProductOption]] = None
    """Products found online by \`search_products\`; nothing is added until the user picks one."""
    removals: List[str] = Field(default_factory=list)
    """IDs of existing non-fixed items \`remove_items\` proposes to delete when applied."""


class ChatProgressEvent(ContractModel):
    event: Literal["progress"] = "progress"
    data: LayoutProgress


class ChatReplyEvent(ContractModel):
    event: Literal["reply"] = "reply"
    data: ChatReply


class ChatErrorEvent(ContractModel):
    event: Literal["error"] = "error"
    data: LayoutStreamError


ChatStreamEvent = ChatProgressEvent | ChatReplyEvent | ChatErrorEvent
"""POST /chat/stream SSE: event is the SSE name; data is its JSON payload. The terminal event
is \`reply\`, not \`result\`, so it can never be read as a \`LayoutStreamEvent\` result."""


class _FengShuiModel(ContractModel):
    model_config = ConfigDict(use_attribute_docstrings=True, extra="forbid", allow_inf_nan=False)


class FengShuiMirror(_FengShuiModel):
    id: str = Field(min_length=1, max_length=100)
    x: float
    y: float = Field(ge=0)
    z: float
    width_m: float = Field(gt=0)
    height_m: float = Field(gt=0)
    normal_yaw_deg: float
    is_fixed: bool = True


class FengShuiActivityAnchor(_FengShuiModel):
    item_id: str
    kind: Literal["seated", "headboard"]
    x: float
    z: float
    facing_yaw_deg: float


class FengShuiRequest(_FengShuiModel):
    """POST /feng-shui and /feng-shui/score."""

    scene: RoomScene
    room_use: str = Field(default="unspecified", max_length=200)
    main_entry_door_id: Optional[str] = None
    mirrors: Optional[List[FengShuiMirror]] = Field(default=None, max_length=60)
    activities: List[FengShuiActivityAnchor] = Field(default_factory=list, max_length=120)
    observations: str = Field(default="", max_length=3000)
    """Optional observed beams, clutter, materials, lighting and other non-geometric context."""


class FengShuiRuleScore(_FengShuiModel):
    rule: str
    object_ids: List[str]
    score: float = Field(ge=0, le=1)
    weight: float = Field(gt=0)
    detail: str


class FengShuiScore(_FengShuiModel):
    """POST /feng-shui/score: deterministic Form School score, no model call."""

    scene_id: str
    revision: int
    score: Optional[int]
    """0-100. None when the room has no door or no bed, desk or sofa: never read as zero."""
    coverage: float = Field(ge=0, le=1)
    """Assessed weight / weight applicable to this room."""
    capped_by_audit: bool
    """True when the audit found collisions, blocked doors or out-of-bounds items, which cap
    the score: tradition never outranks fit and access."""
    sightlines: List[FengShuiSightline]
    rules: List[FengShuiRuleScore]
    unassessed: List[str]


class RenderCamera(ContractModel):
    position: Vec3
    target: Vec3
    fov_deg: float
    """Vertical field of view (perspective camera). The camera's up vector is +Y (no roll)."""
    near_m: float
    far_m: float


class RenderBundle(ContractModel):
    """Aligned render maps from one scene revision, camera and resolution (produced by the editor,
    consumed by the photoreal adapter).

    - \`rgb_png\`: 8-bit sRGB PNG.
    - \`depth_png\`: 16-bit greyscale PNG of linear camera-space distance along the view axis.
      Values 0..65534 encode depth_m = near_m + (value / 65534) * (far_m - near_m), with geometry
      beyond far_m clamped to 65534. 65535 is reserved for "no geometry" (background).
    - \`mask_png\`: 8-bit greyscale PNG of object indices.
    PNG fields are data URLs (\`data:image/png;base64,...\`).
    """

    scene_id: str
    scene_revision: int
    width: int
    height: int
    camera: RenderCamera
    rgb_png: str
    depth_png: str
    mask_png: str
    mask_ids: Dict[int, str]
    """Every index used in mask_png -> ID. Always contains 0 -> "background" and 1 -> "shell";
    2 and above map to furniture item IDs."""
`,t=`"""Spatial checks independent of HTTP, mesh loading and provider services."""

from collections.abc import Sequence
from itertools import combinations
from math import isclose, isfinite

from shapely.affinity import rotate  # type: ignore[import-untyped]
from shapely.geometry import Polygon  # type: ignore[import-untyped]
from shapely.ops import unary_union  # type: ignore[import-untyped]

from contracts.schema import (
    MIN_HEIGHT_OVERLAP_M,
    MIN_PLAN_OVERLAP_M2,
    BlockedDoorIssue,
    ClearanceIssue,
    CollisionIssue,
    FurnitureItem,
    RoomScene,
)
from services.spatial_engine.geometry import (
    FurnitureGeometry,
    SceneGeometry,
    SpatialInputError,
    door_swing_sector,
    front_clearance_zone,
    prepare_furniture,
    scene_geometry,
)


def detect_front_clearance(
    scene: RoomScene, *, _prepared: SceneGeometry | None = None
) -> list[ClearanceIssue]:
    """Check full-width front access strips, returning one issue per blocker.

    actual_m is the minimum forward distance from the bbox front to the blocker
    anywhere across that strip, capped to 0..required_m. Boundary incursions use
    blocked_by_item_id=None. Chairs have no front-access checks and never block
    another item's access. Self is ignored; other occupied
    parts below WALK_HEADROOM_M (including fixed items) block access. High parts
    do not. This is a conservative standing-access check, not an articulated
    drawer/door simulation or a reachability assessment.

    Ignore area <= 1e-9 m² and distance deficits <= 1e-9 m as numerical noise.
    Results are ordered by target ID, boundary first, then blocker ID. Invalid
    geometry, invalid required clearance or duplicate item IDs raise ValueError.
    Inputs are never modified.
    """
    prepared = scene_geometry(scene, _prepared)
    floor = prepared.floor
    furniture = [entry.item for entry in prepared.furniture]
    zones = {item.id: front_clearance_zone(item) for item in furniture}
    issues = []
    for target in furniture:
        zone = zones[target.id]
        if target.category == "chair" or zone.is_empty:
            continue
        blockers: list[tuple[str | None, Polygon]] = [(None, zone.difference(floor))]
        for other in prepared.furniture:
            if other.item.id == target.id or other.item.category == "chair":
                continue
            if not other.walking_projection.is_empty:
                blockers.append((other.item.id, zone.intersection(other.walking_projection)))
        for blocker_id, intersection in blockers:
            if intersection.is_empty or intersection.area <= 1e-9:
                continue
            # Undo Three.js yaw around the target; local +Z is forward.
            local = rotate(
                intersection, target.pose.yaw_deg % 360, origin=(target.pose.x, target.pose.z)
            )
            actual = max(
                0.0,
                min(
                    target.requires_front_clear_m,
                    float(local.bounds[1]) - target.pose.z - target.bbox_m.depth / 2,
                ),
            )
            if target.requires_front_clear_m - actual > 1e-9:
                issues.append(
                    ClearanceIssue(
                        item_id=target.id,
                        required_m=target.requires_front_clear_m,
                        actual_m=actual,
                        blocked_by_item_id=blocker_id,
                    )
                )
    return issues


def calculate_free_floor_ratio(
    scene: RoomScene, *, _prepared: SceneGeometry | None = None
) -> float:
    """Return the usable floor fraction not blocked under the shared headroom rule.

    Project occupied parts with y_min < WALK_HEADROOM_M onto the floor, union
    them (including fixed items), and clip to the interior floor polygon. Empty
    parts mean a solid bbox. Parts at or above the headroom threshold do not
    block floor. Overlapping parts/items never subtract area twice.

    This is geometric free area, not reachable circulation, passage width or
    accessibility. Door swings and front-clearance reservations are not deducted.
    No AuditReport field is assigned here. Inputs are not modified; invalid
    floor/furniture geometry and duplicate furniture IDs raise ValueError.
    """
    prepared = scene_geometry(scene, _prepared)
    floor = prepared.floor
    free_area = float(prepared.free_floor.area)
    if not isfinite(free_area):
        raise SpatialInputError("Free floor area must be finite")
    return max(0.0, min(1.0, free_area / float(floor.area)))


def height_overlaps(bottom_a: float, top_a: float, bottom_b: float, top_b: float) -> bool:
    overlap = min(top_a, top_b) - max(bottom_a, bottom_b)
    # Decimal threshold equality must not become a collision through subtraction noise.
    return overlap > MIN_HEIGHT_OVERLAP_M and not isclose(
        overlap, MIN_HEIGHT_OVERLAP_M, rel_tol=1e-12, abs_tol=1e-12
    )


def detect_blocked_doors(
    scene: RoomScene,
    *,
    area_tolerance_m2: float = MIN_PLAN_OVERLAP_M2,
    _prepared: SceneGeometry | None = None,
) -> list[BlockedDoorIssue]:
    """Report furniture intersecting door sweeps, sorted by door and item ID.

    Tests occupied parts against the door sweep from floor to head_height_m,
    using shared plan/height thresholds. Empty parts mean a solid bbox. This
    checks leaf obstruction, not walking access through the doorway. Contact
    alone is allowed; each door/item pair is reported only once.
    Outward sweeps are not clipped to the room, so outside items can block them.
    Invalid geometry/references and duplicate IDs raise ValueError, even when no
    furniture is present. Does not modify the scene.
    """
    if not isfinite(area_tolerance_m2) or area_tolerance_m2 < 0:
        raise SpatialInputError("Door overlap tolerance must be finite and non-negative")
    prepared = scene_geometry(scene, _prepared)
    walls = {wall.id: wall for wall in scene.walls}
    issues = []
    for door in sorted(scene.doors, key=lambda d: d.id):
        if door.wall_id not in walls:
            raise SpatialInputError(f"Door {door.id} references an unknown wall")
        sweep = door_swing_sector(door, walls[door.wall_id], scene.floor_polygon)
        for entry in prepared.furniture:
            for part in entry.volumes:
                if not height_overlaps(0, door.head_height_m, part.y_min, part.y_max):
                    continue
                area = float(sweep.intersection(part.footprint).area)
                if not isfinite(area):
                    raise SpatialInputError("Door overlap area must be finite")
                if area > area_tolerance_m2:
                    issues.append(
                        BlockedDoorIssue(door_id=door.id, blocked_by_item_id=entry.item.id)
                    )
                    break
    return issues


def detect_out_of_bounds(
    scene: RoomScene,
    *,
    boundary_tolerance_m: float = 1e-9,
    _prepared: SceneGeometry | None = None,
) -> list[str]:
    """Return sorted item IDs whose rectangular footprint leaves the interior floor.

    Boundary contact is allowed. The tolerance expands the floor by this distance
    solely to absorb floating-point noise; it is not wall thickness or clearance.
    Set it to zero for exact containment. Walls/shell meshes and item height do
    not affect this floor-layout check. Inputs are never modified.

    Raises ValueError for invalid floor/footprints, duplicate furniture IDs, or
    a non-finite/negative tolerance. Validates the floor even with no furniture.
    """
    if not isfinite(boundary_tolerance_m) or boundary_tolerance_m < 0:
        raise SpatialInputError("Boundary tolerance must be finite and non-negative")
    prepared = scene_geometry(scene, _prepared)
    floor = prepared.floor
    allowed_floor = floor.buffer(boundary_tolerance_m) if boundary_tolerance_m else floor
    return [
        entry.item.id for entry in prepared.furniture if not allowed_floor.covers(entry.footprint)
    ]


def detect_collisions(
    furniture: Sequence[FurnitureItem],
    *,
    area_tolerance_m2: float = MIN_PLAN_OVERLAP_M2,
    _prepared: tuple[FurnitureGeometry, ...] | None = None,
) -> list[CollisionIssue]:
    """Report each overlapping pair once, in stable item-ID order.

    Whole bounding footprints provide a broad phase. Occupied parts must overlap
    in plan above the area tolerance and in height above MIN_HEIGHT_OVERLAP_M.
    Empty parts fall back to a solid bbox. Report the union area of qualifying
    part intersections, without double counting. Defaults follow shared contracts.

    Raises ValueError for duplicate IDs, invalid footprints, or a non-finite or
    negative tolerance. Input items and their order are never modified.
    """
    if not isfinite(area_tolerance_m2) or area_tolerance_m2 < 0:
        raise SpatialInputError("Collision area tolerance must be finite and non-negative")
    geometry = prepare_furniture(furniture) if _prepared is None else _prepared
    issues = []
    for a, b in combinations(geometry, 2):
        # Parts may extend up to the contract's bbox tolerance, so broad-phase
        # rejection must include their actual bounds as well as the nominal box.
        if not a.broad_bounds.intersects(b.broad_bounds):
            continue
        intersections = []
        for part_a in a.volumes:
            for part_b in b.volumes:
                if not height_overlaps(part_a.y_min, part_a.y_max, part_b.y_min, part_b.y_max):
                    continue
                intersection = part_a.footprint.intersection(part_b.footprint)
                area = float(intersection.area)
                if not isfinite(area):
                    raise SpatialInputError("Furniture overlap area must be finite")
                if area > area_tolerance_m2:
                    intersections.append(intersection)
        if intersections:
            area = float(unary_union(intersections).area)
            issues.append(CollisionIssue(item_a=a.item.id, item_b=b.item.id, overlap_area_m2=area))
    return issues
`,n=`"""Shared Feng Shui inputs and validation, independent of the model harness."""

from pydantic import BaseModel, ConfigDict

from contracts.schema import AuditReport, FengShuiActivityAnchor, FengShuiMirror, FengShuiRequest
from services.spatial_engine.geometry import SpatialInputError
from services.spatial_engine.report import audit_scene


class DetailModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


# The request models live in contracts/schema.py; these names stay for existing imports.
Mirror = FengShuiMirror
ActivityAnchor = FengShuiActivityAnchor
__all__ = ["ActivityAnchor", "DetailModel", "FengShuiRequest", "Mirror"]


def validate_feng_shui_request(request: FengShuiRequest) -> tuple[AuditReport, list[str]]:
    """Shared validation for the assessment and the score; returns the audit and object IDs."""
    scene = request.scene
    if len(scene.furniture) > 60:
        raise SpatialInputError("Feng shui assessments support at most 60 furniture items")
    # Validate the complete scene at the same boundary as the deterministic audit.
    audit = audit_scene(scene)
    item_ids = {i.id for i in scene.furniture}
    door_ids = {d.id for d in scene.doors}
    if request.main_entry_door_id is not None and request.main_entry_door_id not in door_ids:
        raise SpatialInputError("Unknown main entry door")
    if any(a.item_id not in item_ids for a in request.activities):
        raise SpatialInputError("Activity anchor references unknown furniture")
    ids = (
        [i.id for i in scene.furniture]
        + [d.id for d in scene.doors]
        + [w.id for w in scene.windows]
        + [w.id for w in scene.walls]
    )
    ids.extend(m.id for m in request.mirrors or [])
    if len(ids) != len(set(ids)):
        raise SpatialInputError("Assessment object IDs must be unique across object types")
    return audit, ids
`,r=`"""A small, transparent Feng Shui placement metric from the command-position tradition.

Only what the scene geometry can show is judged, using three traditional preferences:

- **Command position** - a desk or bed from which the entrance can be seen without being
  directly in line with it.
- **Back to the door** - sitting at a desk, or lying in a bed, where the entrance is behind you.
- **Coffin position** - a bed whose foot points straight at the door.

These are design traditions, not predictions of health, wealth or luck. The score is a plain
average over the beds and desks that can be judged, so it says nothing about the rest of the
room. No beds or desks, or no doors, means the room is not assessed (None), never a score of
zero or a perfect one. Facing uses the furniture convention: a desk's front is the side the
sitter occupies, and a bed's front is its foot end.
"""

from math import acos, cos, degrees, hypot, radians, sin

from shapely.geometry import LineString  # type: ignore[import-untyped]

from contracts.schema import FengShuiReport, FengShuiSightline, FurnitureItem, RoomScene
from services.spatial_engine.geometry import SceneGeometry, door_center, scene_geometry

VIEW_HALF_ANGLE_DEG = 100.0
"""The entrance counts as seen when it lies within this angle of the occupant's facing."""
COFFIN_HALF_ANGLE_DEG = 20.0
"""A bed's foot points at the door when the door lies within this angle of its foot direction."""
COFFIN_SIDE_MARGIN_M = 0.3
DESK_SEAT_OFFSET_M = 0.45
VIEW_HEIGHT_M = 1.2

_POINTS = {"command_position": 1.0, "unclear": 0.5, "back_to_door": 0.0, "coffin_alignment": 0.0}


def _front(item: FurnitureItem) -> tuple[float, float]:
    yaw = radians(item.pose.yaw_deg)
    return sin(yaw), cos(yaw)


def _angle_deg(a: tuple[float, float], b: tuple[float, float]) -> float:
    la, lb = hypot(*a), hypot(*b)
    if la == 0 or lb == 0:
        return 0.0
    dot = (a[0] * b[0] + a[1] * b[1]) / (la * lb)
    return degrees(acos(max(-1.0, min(1.0, dot))))


def _occupant(item: FurnitureItem) -> tuple[tuple[float, float], tuple[float, float]] | None:
    """Where a person is and which way they face, or None for items we do not judge."""
    fx, fz = _front(item)
    x, z = item.pose.x, item.pose.z
    if item.category == "desk":
        reach = item.bbox_m.depth / 2 + DESK_SEAT_OFFSET_M
        return (x + fx * reach, z + fz * reach), (-fx, -fz)
    if item.category == "bed":
        head = item.bbox_m.depth / 4
        return (x - fx * head, z - fz * head), (fx, fz)
    return None


def _wording(item: FurnitureItem, status: str) -> str:
    noun = "desk" if item.category == "desk" else "bed"
    if status == "command_position":
        return f"From this {noun} you can see the door without facing it head-on."
    if status == "back_to_door":
        return (
            f"Sitting at this {noun} puts the door behind you."
            if noun == "desk"
            else f"Lying in this {noun}, the door is behind you."
        )
    return "The foot of this bed points straight at the door."


def calculate_feng_shui(
    scene: RoomScene, *, _prepared: SceneGeometry | None = None
) -> FengShuiReport | None:
    prepared = scene_geometry(scene, _prepared)
    if not scene.doors:
        return None
    walls = {wall.id: wall for wall in scene.walls}
    doors = [
        (door, door_center(door, walls[door.wall_id], scene.floor_polygon)) for door in scene.doors
    ]
    room = prepared.floor.buffer(0.05)
    sightlines: list[FengShuiSightline] = []
    points: list[float] = []
    for item in sorted(scene.furniture, key=lambda i: i.id):
        occupant = _occupant(item)
        if occupant is None:
            continue
        (ox, oz), facing = occupant
        door, (dx, dz) = min(doors, key=lambda entry: hypot(entry[1][0] - ox, entry[1][1] - oz))
        toward = (dx - ox, dz - oz)
        angle = _angle_deg(facing, toward)
        status = "unclear"
        if item.category == "bed" and angle <= COFFIN_HALF_ANGLE_DEG:
            across = abs(toward[0] * facing[1] - toward[1] * facing[0]) / (hypot(*facing) or 1.0)
            if across <= item.bbox_m.width / 2 + COFFIN_SIDE_MARGIN_M:
                status = "coffin_alignment"
        if status == "unclear":
            if angle > VIEW_HALF_ANGLE_DEG:
                status = "back_to_door"
            elif not (item.category == "desk" and angle <= COFFIN_HALF_ANGLE_DEG):
                line = LineString([(ox, oz), (dx, dz)])
                obstructed = any(
                    volume.y_min <= VIEW_HEIGHT_M <= volume.y_max
                    and volume.footprint.intersects(line)
                    for entry in prepared.furniture
                    if entry.item.id != item.id
                    for volume in entry.volumes
                )
                if room.covers(line) and not obstructed:
                    status = "command_position"
        points.append(_POINTS[status])
        if status != "unclear":
            sightlines.append(
                FengShuiSightline(
                    from_item_id=item.id,
                    to_door_id=door.id,
                    status=status,  # type: ignore[arg-type]
                    reason=_wording(item, status),
                )
            )
    if not points:
        return None
    return FengShuiReport(score=round(100 * sum(points) / len(points)), sightlines=sightlines)
`,i=`"""Deterministic Form School feng shui score from plan geometry; no model call.

Every rule yields a sub-score in [0, 1] with a weight. The score is the weighted mean of the
rules that could be assessed, times 100. \`coverage\` is the assessed share of the weight that
applies to the room, so a partial assessment never reads as a clean bill of health. Compass
schools (bagua, Flying Stars) are never used. See the spatial service README for the table.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from math import acos, cos, degrees, hypot, radians, sin

from shapely.geometry import LineString, Point, Polygon  # type: ignore[import-untyped]
from shapely.ops import unary_union  # type: ignore[import-untyped]

from contracts.schema import (
    AuditReport,
    DoorOpening,
    FengShuiRuleScore,
    FengShuiScore,
    FengShuiSightline,
    RoomScene,
)
from services.spatial_engine.feng_shui_inputs import (
    FengShuiRequest,
    validate_feng_shui_request,
)
from services.spatial_engine.geometry import (
    FurnitureGeometry,
    SceneGeometry,
    SpatialInputError,
    door_opening_frame,
    prepare_scene,
    window_plan_segment,
)

Vec = tuple[float, float]

KEY_CATEGORIES = ("bed", "desk", "sofa")
"""Items with an occupant whose position the command-position rules judge."""
TALL_M = 1.2
"""Items taller than this block a seated or lying occupant's view of a door."""
LOW_M = 0.4
"""Items lower than this (rugs, mats) neither cut a draught nor aim a corner."""
AUDIT_CAP = 50
"""Highest score while the audit reports collisions, blocked doors or out-of-bounds items."""
NOT_MODELLED = (
    "beams, clutter, materials, colour, plants and lighting are not modelled from geometry",
)

WEIGHTS = {
    "door_visible": 3.0,
    "line_of_sight": 1.0,
    "door_axis": 2.0,
    "backing": 2.0,
    "bed_side_access": 1.0,
    "sharp_corners": 1.0,
    "door_window_draught": 1.0,
    "entry_openness": 1.0,
    "balance": 0.5,
    "mirror_reflection": 1.0,
}
_DOOR_RULES = ("door_visible", "line_of_sight", "door_axis")


# The response models live in contracts/schema.py (FengShuiScore, FengShuiRuleScore).
RuleScore = FengShuiRuleScore


@dataclass(frozen=True)
class _Occupant:
    item: FurnitureGeometry
    position: Vec
    facing: Vec
    back: Vec
    back_edge: LineString
    anchored: bool

    @property
    def label(self) -> str:
        return "anchored occupant" if self.anchored else "default occupant"


@dataclass(frozen=True)
class _Door:
    door: DoorOpening
    centre: Vec
    normal: Vec
    leaf: LineString


def _add(a: Vec, b: Vec, k: float = 1.0) -> Vec:
    return (a[0] + k * b[0], a[1] + k * b[1])


def _sub(a: Vec, b: Vec) -> Vec:
    return (a[0] - b[0], a[1] - b[1])


def _dot(a: Vec, b: Vec) -> float:
    return a[0] * b[0] + a[1] * b[1]


def _unit(v: Vec) -> Vec | None:
    length = hypot(*v)
    return None if length < 1e-9 else (v[0] / length, v[1] / length)


def _yaw(deg: float) -> Vec:
    """Front vector in plan, matching geometry.furniture_footprint."""
    return (sin(radians(deg)), cos(radians(deg)))


def _angle_deg(a: Vec, b: Vec) -> float:
    ua, ub = _unit(a), _unit(b)
    if ua is None or ub is None:
        return 0.0
    return degrees(acos(max(-1.0, min(1.0, _dot(ua, ub)))))


def _rect(centre: Vec, u: Vec, half_u: float, half_v: float) -> Polygon:
    """Rectangle with half-extent half_u along unit u and half_v along u rotated 90 degrees."""
    v = (-u[1], u[0])
    return Polygon(
        [
            _add(_add(centre, u, su * half_u), v, sv * half_v)
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1))
        ]
    )


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _height(entry: FurnitureGeometry) -> float:
    return max((v.y_max for v in entry.volumes), default=entry.item.bbox_m.height)


def _occupants(request: FengShuiRequest, furniture: Iterable[FurnitureGeometry]) -> list[_Occupant]:
    anchors: dict[str, list[tuple[str, Vec, Vec]]] = {}
    for a in request.activities:
        anchors.setdefault(a.item_id, []).append((a.kind, (a.x, a.z), _yaw(a.facing_yaw_deg)))
    result = []
    for entry in furniture:
        item = entry.item
        front = _yaw(item.pose.yaw_deg)
        pose = (item.pose.x, item.pose.z)
        width, depth = item.bbox_m.width, item.bbox_m.depth
        if item.id in anchors:
            for kind, point, facing in anchors[item.id]:
                if kind == "headboard":
                    occupant, back, edge = _add(point, facing, 0.3), point, width
                else:
                    occupant, back, edge = point, _add(point, facing, -0.3), 0.6
                result.append(
                    _Occupant(entry, occupant, facing, back, _edge(back, facing, edge), True)
                )
            continue
        if item.category not in KEY_CATEGORIES:
            continue
        if item.category == "desk":
            occupant = _add(pose, front, depth / 2 + 0.45)
            facing = (-front[0], -front[1])
            back = _add(occupant, front, 0.3)
            result.append(_Occupant(entry, occupant, facing, back, _edge(back, facing, 0.6), False))
        else:
            back = _add(pose, front, -depth / 2)
            occupant = _add(back, front, min(0.3, depth / 2)) if item.category == "bed" else pose
            result.append(_Occupant(entry, occupant, front, back, _edge(back, front, width), False))
    return result


def _edge(centre: Vec, facing: Vec, length: float) -> LineString:
    side = (facing[1], -facing[0])
    return LineString([_add(centre, side, -length / 2), _add(centre, side, length / 2)])


def _doors(request: FengShuiRequest) -> list[_Door]:
    scene = request.scene
    walls = {w.id: w for w in scene.walls}
    doors = []
    for door in scene.doors:
        if request.main_entry_door_id is not None and door.id != request.main_entry_door_id:
            continue
        if door.wall_id not in walls:
            raise SpatialInputError("Door references an unknown wall")
        centre, normal, leaf = door_opening_frame(door, walls[door.wall_id], scene.floor_polygon)
        doors.append(_Door(door, centre, normal, leaf))
    return doors


def _door_strip(door: _Door, reach: float) -> Polygon:
    """The door's width projected straight into the room for \`reach\` metres."""
    return _rect(
        _add(door.centre, door.normal, reach / 2), door.normal, reach / 2, door.door.width_m / 2
    )


def _command_rules(
    occ: _Occupant,
    doors: list[_Door],
    others: list[FurnitureGeometry],
    floor: Polygon,
    reach: float,
) -> tuple[list[RuleScore], list[FengShuiSightline]]:
    item = occ.item.item
    is_bed = item.category == "bed"
    tall = [o.footprint for o in others if _height(o) > TALL_M]
    walkable = floor.buffer(1e-3)
    scores: dict[str, list[float]] = {rule: [] for rule in _DOOR_RULES}
    notes: dict[str, list[str]] = {rule: [] for rule in _DOOR_RULES}
    sightlines = []
    for d in doors:
        to_door = _sub(d.centre, occ.position)
        theta = _angle_deg(occ.facing, to_door)
        visible = 1.0 if theta <= 60 else _clamp((120 - theta) / 60)
        sight = LineString([occ.position, d.centre])
        clear = walkable.covers(sight) and not any(sight.intersects(t) for t in tall)
        rel = _sub(occ.position, d.centre)
        t, offset = _dot(rel, d.normal), abs(rel[0] * d.normal[1] - rel[1] * d.normal[0])
        coffin = (
            is_bed
            and _dot(occ.facing, (-d.normal[0], -d.normal[1])) > cos(radians(20))
            and _door_strip(d, reach).intersects(occ.item.footprint)
        )
        in_line = t > 0 and offset < d.door.width_m / 2 + 0.3
        axis = 0.0 if coffin else 0.5 if in_line else 1.0
        scores["door_visible"].append(visible)
        scores["line_of_sight"].append(1.0 if clear else 0.0)
        scores["door_axis"].append(axis)
        notes["door_visible"].append(f"{d.door.id}: door {theta:.0f}° from facing")
        notes["line_of_sight"].append(f"{d.door.id}: {'clear' if clear else 'blocked'}")
        notes["door_axis"].append(
            f"{d.door.id}: "
            + ("feet toward door in its line" if coffin else f"{offset:.2f} m off door axis")
        )
        if coffin:
            reason = "Bed foot points out of the door, in its direct line"
            sightlines.append(
                FengShuiSightline(
                    from_item_id=item.id,
                    to_door_id=d.door.id,
                    status="coffin_alignment",
                    reason=reason,
                )
            )
        elif theta > 120:
            reason = f"Door is {theta:.0f}° from the occupant's facing direction"
            sightlines.append(
                FengShuiSightline(
                    from_item_id=item.id, to_door_id=d.door.id, status="back_to_door", reason=reason
                )
            )
        elif visible >= 0.8 and clear and axis == 1.0:
            reason = f"Door visible ({theta:.0f}° from facing), clear sightline, off its axis"
            sightlines.append(
                FengShuiSightline(
                    from_item_id=item.id,
                    to_door_id=d.door.id,
                    status="command_position",
                    reason=reason,
                )
            )
    rules = [
        RuleScore(
            rule=rule,
            object_ids=[item.id, *(d.door.id for d in doors)],
            score=round(sum(values) / len(values), 3),
            weight=WEIGHTS[rule],
            detail=f"{occ.label}; " + "; ".join(notes[rule]),
        )
        for rule, values in scores.items()
    ]
    return rules, sightlines


def _backing(occ: _Occupant, floor: Polygon, openings: list[LineString]) -> RuleScore:
    gap = floor.exterior.distance(Point(occ.back))
    near = _clamp(1 - (gap - 0.1) / 0.5)
    band = occ.back_edge.buffer(0.15, cap_style="flat")
    exposed = sum(band.intersection(o).length for o in openings)
    exposure = _clamp(exposed / max(occ.back_edge.length, 1e-9))
    return RuleScore(
        rule="backing",
        object_ids=[occ.item.item.id],
        score=round(near * (1 - exposure), 3),
        weight=WEIGHTS["backing"],
        detail=f"{occ.label}; back {gap:.2f} m from a wall, {exposure:.0%} against an opening",
    )


def _bed_side_access(bed: FurnitureGeometry, floor: Polygon, blockers: Polygon) -> RuleScore:
    item = bed.item
    front = _yaw(item.pose.yaw_deg)
    right = (front[1], -front[0])
    free = []
    for side in (-1, 1):
        centre = _add((item.pose.x, item.pose.z), right, side * (item.bbox_m.width / 2 + 0.3))
        strip = _rect(centre, front, item.bbox_m.depth / 2, 0.3)
        free.append(strip.intersection(floor).difference(blockers).area / strip.area)
    return RuleScore(
        rule="bed_side_access",
        object_ids=[item.id],
        score=round(_clamp(min(free)), 3),
        weight=WEIGHTS["bed_side_access"],
        detail=f"0.6 m strips beside the bed are {free[0]:.0%} and {free[1]:.0%} free",
    )


def _sharp_corners(occ: _Occupant, others: list[FurnitureGeometry]) -> RuleScore:
    aimed = []
    for other in others:
        if _height(other) < LOW_M:
            continue
        centroid = (other.footprint.centroid.x, other.footprint.centroid.y)
        for corner in list(other.footprint.exterior.coords)[:-1]:
            to_occ = _sub(occ.position, corner)
            bisector = _unit(_sub(corner, centroid))
            direction = _unit(to_occ)
            if hypot(*to_occ) > 1.5 or bisector is None or direction is None:
                continue
            if _dot(bisector, direction) > cos(radians(30)):
                aimed.append(other.item.id)
    return RuleScore(
        rule="sharp_corners",
        object_ids=[occ.item.item.id, *sorted(set(aimed))],
        score=max(0.0, 1 - 0.25 * len(aimed)),
        weight=WEIGHTS["sharp_corners"],
        detail=f"{occ.label}; {len(aimed)} furniture corner(s) within 1.5 m aimed at it",
    )


def _draught(d: _Door, scene: RoomScene, reach: float, solid: list[Polygon]) -> RuleScore:
    walls = {w.id: w for w in scene.walls}
    strip = _door_strip(d, reach)
    overlap, ids = 0.0, [d.door.id]
    for window in scene.windows:
        if window.wall_id == d.door.wall_id or window.wall_id not in walls:
            continue
        length = (
            window_plan_segment(window, walls[window.wall_id])
            .intersection(strip.buffer(0.05))
            .length
        )
        if length > 0:
            overlap += length
            ids.append(window.id)
    shielded = overlap > 0 and any(strip.intersects(s) for s in solid)
    score = 1.0 if shielded else _clamp(1 - overlap / d.door.width_m)
    detail = (
        "no window opposite the door"
        if overlap == 0
        else f"{overlap:.2f} m of window opposite the door, "
        + ("shielded by furniture" if shielded else "unshielded")
    )
    return RuleScore(
        rule="door_window_draught",
        object_ids=ids,
        score=round(score, 3),
        weight=WEIGHTS["door_window_draught"],
        detail=detail,
    )


def _entry_openness(d: _Door, floor: Polygon, blockers: Polygon) -> RuleScore:
    half_disc = (
        Point(d.centre)
        .buffer(1.0)
        .intersection(_rect(_add(d.centre, d.normal, 0.5), d.normal, 0.5, 1.0))
        .intersection(floor)
    )
    free = half_disc.difference(blockers).area / half_disc.area if half_disc.area > 0 else 0.0
    return RuleScore(
        rule="entry_openness",
        object_ids=[d.door.id],
        score=round(_clamp(free), 3),
        weight=WEIGHTS["entry_openness"],
        detail=f"{free:.0%} of the 1 m area inside is free",
    )


def _balance(furniture: tuple[FurnitureGeometry, ...], floor: Polygon) -> RuleScore:
    mass = unary_union([f.footprint for f in furniture]).centroid
    minx, miny, maxx, maxy = floor.bounds
    shift = mass.distance(floor.centroid)
    half_diagonal = hypot(maxx - minx, maxy - miny) / 2
    return RuleScore(
        rule="balance",
        object_ids=[f.item.id for f in furniture],
        score=round(_clamp(1 - shift / half_diagonal), 3),
        weight=WEIGHTS["balance"],
        detail=f"furniture centre of mass is {shift:.2f} m from the room centre",
    )


def _mirror(
    request: FengShuiRequest, beds: list[_Occupant], furniture: tuple[FurnitureGeometry, ...]
) -> list[RuleScore]:
    rules = []
    for mirror in request.mirrors or []:
        normal, origin, seen = _yaw(mirror.normal_yaw_deg), (mirror.x, mirror.z), []
        for bed in beds:
            to_bed = _sub(bed.position, origin)
            if _dot(to_bed, normal) <= 0 or _angle_deg(normal, to_bed) > 60:
                continue
            ray = LineString([origin, bed.position])
            blockers = [
                f.footprint
                for f in furniture
                if f.item.id != bed.item.item.id and _height(f) > TALL_M
            ]
            if not any(ray.intersects(b) for b in blockers):
                seen.append(bed.item.item.id)
        rules.append(
            RuleScore(
                rule="mirror_reflection",
                object_ids=[mirror.id, *seen],
                score=0.0 if seen else 1.0,
                weight=WEIGHTS["mirror_reflection"],
                detail="faces a bed with nothing tall between" if seen else "faces no bed",
            )
        )
    return rules


def score_feng_shui(
    request: FengShuiRequest,
    *,
    _audit: AuditReport | None = None,
    _prepared: SceneGeometry | None = None,
) -> FengShuiScore:
    """Score a room read-only. Raises SpatialInputError for invalid scenes or references.

    The layout optimiser passes the audit and geometry it already computed for the same
    scene. That skips the assessment-only request checks (such as IDs unique across object
    types), which a scene the audit accepts may not meet.
    """
    if _audit is None or _prepared is None:
        _audit, _ = validate_feng_shui_request(request)
        _prepared = prepare_scene(request.scene)
    audit = _audit
    scene = request.scene
    prepared = _prepared
    floor = prepared.floor
    furniture = prepared.furniture
    minx, miny, maxx, maxy = floor.bounds
    reach = hypot(maxx - minx, maxy - miny)
    doors = _doors(request)
    occupants = _occupants(request, furniture)
    blockers = unary_union([f.footprint for f in furniture]) if furniture else Polygon()
    solid = [f.footprint for f in furniture if _height(f) >= LOW_M]
    walls = {w.id: w for w in scene.walls}
    openings = [d.leaf for d in doors] + [
        window_plan_segment(w, walls[w.wall_id]) for w in scene.windows if w.wall_id in walls
    ]
    rules: list[RuleScore] = []
    sightlines: list[FengShuiSightline] = []
    unassessed: list[str] = list(NOT_MODELLED)
    missing_weight = 0.0

    for occ in occupants:
        others = [f for f in furniture if f.item.id != occ.item.item.id]
        if doors:
            found, lines = _command_rules(occ, doors, others, floor, reach)
            rules += found
            sightlines += lines
        else:
            missing_weight += sum(WEIGHTS[r] for r in _DOOR_RULES)
        rules.append(_backing(occ, floor, openings))
        rules.append(_sharp_corners(occ, others))
    for bed in (f for f in furniture if f.item.category == "bed"):
        others = unary_union([f.footprint for f in furniture if f.item.id != bed.item.id])
        rules.append(_bed_side_access(bed, floor, others))
    for d in doors:
        rules.append(_draught(d, scene, reach, solid))
        rules.append(_entry_openness(d, floor, blockers))
    if furniture:
        rules.append(_balance(furniture, floor))
    beds = [o for o in occupants if o.item.item.category == "bed"]
    if request.mirrors is None:
        if beds:
            missing_weight += WEIGHTS["mirror_reflection"]
            unassessed.append("mirror_reflection: no mirror inventory supplied")
    else:
        rules += _mirror(request, beds, furniture)

    if not doors:
        missing_weight += WEIGHTS["door_window_draught"] + WEIGHTS["entry_openness"]
        unassessed.append("door rules: the room has no known door")
    if not occupants:
        unassessed.append("command position: no bed, desk, sofa or activity anchor")
    elif not any(o.anchored for o in occupants):
        unassessed.append("occupant positions inferred from furniture category; add anchors")

    total = sum(r.weight for r in rules)
    coverage = total / (total + missing_weight) if total + missing_weight > 0 else 0.0
    score = None
    capped = False
    if doors and occupants and total > 0:
        score = round(100 * sum(r.weight * r.score for r in rules) / total)
        if audit.collisions or audit.blocked_doors or audit.out_of_bounds_item_ids:
            capped = True
            score = min(score, AUDIT_CAP)
    return FengShuiScore(
        scene_id=scene.scene_id,
        revision=scene.revision,
        score=score,
        coverage=round(coverage, 3),
        capped_by_audit=capped,
        sightlines=sightlines,
        rules=rules,
        unassessed=unassessed,
    )
`,a=`"""Metric floor geometry using the coordinate conventions in contracts.schema."""

from collections.abc import Sequence
from dataclasses import dataclass
from math import atan2, ceil, cos, hypot, isfinite, radians, sin

# The existing spatial extra ships Shapely without type stubs.
from shapely.affinity import rotate, translate  # type: ignore[import-untyped]
from shapely.geometry import LineString, Point, Polygon  # type: ignore[import-untyped]
from shapely.geometry.base import BaseGeometry  # type: ignore[import-untyped]
from shapely.ops import unary_union  # type: ignore[import-untyped]

from contracts.schema import (
    WALK_HEADROOM_M,
    CollisionPart,
    DoorOpening,
    FurnitureItem,
    RoomScene,
    Vec2,
    WallSegment,
    WindowOpening,
)

POSITION_TOLERANCE_M = 1e-3
"""How far a door hinge, door leaf or window may sit from its wall, or a wall from the floor
outline, and still count as on it. Reconstructed scenes round coordinates, so exact
agreement cannot be required; 1 mm is far below any size the checks act on."""


class SpatialInputError(ValueError):
    """A validated domain-input failure whose message is safe to show to the caller."""


@dataclass(frozen=True)
class FurnitureGeometry:
    item: FurnitureItem
    footprint: Polygon
    volumes: tuple["CollisionVolume", ...]
    walking_projection: BaseGeometry
    broad_bounds: Polygon


@dataclass(frozen=True)
class SceneGeometry:
    """Request-local derived geometry; never cache across edits or retain globally."""

    scene: RoomScene
    floor: Polygon
    furniture: tuple[FurnitureGeometry, ...]
    free_floor: BaseGeometry


def prepare_furniture(furniture: Sequence[FurnitureItem]) -> tuple[FurnitureGeometry, ...]:
    if len({item.id for item in furniture}) != len(furniture):
        raise SpatialInputError("Furniture IDs must be unique for spatial checks")
    prepared = []
    for item in sorted(furniture, key=lambda item: item.id):
        volumes = tuple(furniture_collision_volumes(item))
        footprint = furniture_footprint(item)
        walking = unary_union([v.footprint for v in volumes if v.y_min < WALK_HEADROOM_M])
        bounds = unary_union([footprint, *(v.footprint for v in volumes)]).envelope
        prepared.append(FurnitureGeometry(item, footprint, volumes, walking, bounds))
    return tuple(prepared)


def prepare_scene(scene: RoomScene) -> SceneGeometry:
    floor = room_floor_polygon(scene.floor_polygon)
    for entries, label in ((scene.walls, "Wall"), (scene.doors, "Door")):
        if len({entry.id for entry in entries}) != len(entries):
            raise SpatialInputError(f"{label} IDs must be unique for spatial checks")
    furniture = prepare_furniture(scene.furniture)
    free = floor.difference(unary_union([entry.walking_projection for entry in furniture]))
    return SceneGeometry(scene, floor, furniture, free)


def scene_geometry(scene: RoomScene, prepared: SceneGeometry | None) -> SceneGeometry:
    if prepared is not None and prepared.scene is not scene:
        raise SpatialInputError("Prepared geometry belongs to a different scene")
    return prepare_scene(scene) if prepared is None else prepared


def front_clearance_zone(item: FurnitureItem) -> Polygon:
    """Full-width rectangle from the bbox front, rotated/placed in room X/Z.

    Zero required clearance returns an empty polygon. Reject invalid dimensions,
    pose or clearance instead of interpreting them as a clear access zone.
    """
    furniture_footprint(item)
    required = item.requires_front_clear_m
    if not isfinite(required) or required < 0:
        raise SpatialInputError("Required front clearance must be finite and non-negative")
    if required == 0:
        return Polygon()
    half_width, front = item.bbox_m.width / 2, item.bbox_m.depth / 2
    zone = Polygon(
        [
            (-half_width, front),
            (half_width, front),
            (half_width, front + required),
            (-half_width, front + required),
        ]
    )
    zone = translate(
        rotate(zone, -(item.pose.yaw_deg % 360), origin=(0, 0)), xoff=item.pose.x, yoff=item.pose.z
    )
    if not zone.is_valid or not isfinite(zone.area) or zone.area <= 0:
        raise SpatialInputError(
            "Front clearance zone must have valid geometry and finite, positive area"
        )
    return zone


@dataclass(frozen=True)
class CollisionVolume:
    """An item's occupied box transformed into a vertical prism in room space."""

    footprint: Polygon
    y_min: float
    y_max: float


def furniture_collision_volumes(item: FurnitureItem) -> list[CollisionVolume]:
    """Transform validated local collision boxes; absent parts mean one solid bbox.

    Revalidate parts because model instances can be mutated after construction.
    Item placement stays at Y=0; this does not introduce elevated item poses.
    """
    furniture_footprint(item)
    if not isfinite(item.bbox_m.height) or item.bbox_m.height <= 0:
        raise SpatialInputError("Furniture height must be finite and positive")
    validated = FurnitureItem.model_validate(item.model_dump())
    box = validated.bbox_m
    parts = validated.collision_parts or [
        CollisionPart(x=0, z=0, width=box.width, depth=box.depth, y_min=0, y_max=box.height)
    ]
    angle = radians(item.pose.yaw_deg % 360)
    c, s = cos(angle), sin(angle)
    volumes = []
    for part in parts:
        points = []
        for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            x, z = part.x + sx * part.width / 2, part.z + sz * part.depth / 2
            points.append((item.pose.x + x * c + z * s, item.pose.z - x * s + z * c))
        footprint = Polygon(points)
        if not footprint.is_valid or not isfinite(footprint.area) or footprint.area <= 0:
            raise SpatialInputError(
                "Collision part must have valid geometry with finite, positive area"
            )
        volumes.append(CollisionVolume(footprint, part.y_min, part.y_max))
    return volumes


@dataclass(frozen=True)
class _DoorFrame:
    hinge: tuple[float, float]
    endpoint: tuple[float, float]
    inward_normal: tuple[float, float]
    start_angle: float
    swing_sign: int


def _door_frame(door: DoorOpening, wall: WallSegment, floor_points: Sequence[Vec2]) -> _DoorFrame:
    """Validate and resolve a door's closed leaf and room side once for all checks."""
    tolerance = POSITION_TOLERANCE_M
    floor = room_floor_polygon(floor_points)
    values = (
        wall.start.x,
        wall.start.z,
        wall.end.x,
        wall.end.z,
        door.hinge_pos.x,
        door.hinge_pos.z,
        door.width_m,
        door.head_height_m,
        door.swing_angle_deg,
    )
    if not all(isfinite(value) for value in values):
        raise SpatialInputError("Door and wall geometry must be finite")
    if door.wall_id != wall.id:
        raise SpatialInputError("Door references a different wall")
    if door.width_m <= 0 or not 0 <= door.swing_angle_deg <= 180:
        raise SpatialInputError(
            "Door width must be positive and opening angle must be in 0..180 degrees"
        )
    if door.head_height_m <= 0:
        raise SpatialInputError("Door head height must be positive")

    dx, dz = wall.end.x - wall.start.x, wall.end.z - wall.start.z
    length = hypot(dx, dz)
    if not isfinite(length) or length <= tolerance:
        raise SpatialInputError("Door wall must have nonzero finite length")
    wall_line = LineString([(wall.start.x, wall.start.z), (wall.end.x, wall.end.z)])
    if not floor.boundary.buffer(tolerance).covers(wall_line):
        raise SpatialInputError("Door wall must lie on the room floor boundary")
    hinge = (door.hinge_pos.x, door.hinge_pos.z)
    if wall_line.distance(Point(hinge)) > tolerance:
        raise SpatialInputError("Door hinge must lie on its wall segment")

    # Find a parallel, overlapping floor edge; the ring winding identifies its interior side.
    tx, tz = dx / length, dz / length
    coords = list(floor.exterior.coords)
    interior_sign = None
    for a, b in zip(coords, coords[1:]):
        ex, ez = b[0] - a[0], b[1] - a[1]
        edge_length = hypot(ex, ez)
        if edge_length == 0 or abs(tx * ez - tz * ex) > tolerance * edge_length:
            continue
        edge = LineString([a, b])
        if edge.distance(wall_line) > tolerance:
            continue
        projections = [((p[0] - wall.start.x) * tx + (p[1] - wall.start.z) * tz) for p in (a, b)]
        if min(length, max(projections)) - max(0.0, min(projections)) <= tolerance:
            continue
        alignment = 1 if tx * ex + tz * ez > 0 else -1
        interior_sign = alignment * (1 if floor.exterior.is_ccw else -1)
        break
    if interior_sign is None:
        raise SpatialInputError("Cannot determine the room side of the door wall")

    # In X/Z plan coordinates, clockwise on screen is positive mathematical rotation.
    swing_sign = 1 if door.swing_clockwise else -1
    side_sign = interior_sign * (1 if door.swings_into_room else -1)
    leaf_sign = side_sign * swing_sign
    start = atan2(leaf_sign * tz, leaf_sign * tx)
    endpoint = (hinge[0] + door.width_m * leaf_sign * tx, hinge[1] + door.width_m * leaf_sign * tz)
    if wall_line.distance(Point(endpoint)) > tolerance:
        raise SpatialInputError("Closed door leaf must fit within its wall segment")
    return _DoorFrame(hinge, endpoint, (-tz * interior_sign, tx * interior_sign), start, swing_sign)


def door_opening_frame(
    door: DoorOpening, wall: WallSegment, floor_points: Sequence[Vec2]
) -> tuple[tuple[float, float], tuple[float, float], LineString]:
    """The opening's centre, unit inward (room-side) normal and closed-leaf segment."""
    frame = _door_frame(door, wall, floor_points)
    centre = (
        (frame.hinge[0] + frame.endpoint[0]) / 2,
        (frame.hinge[1] + frame.endpoint[1]) / 2,
    )
    return centre, frame.inward_normal, LineString([frame.hinge, frame.endpoint])


def door_entry_segment(
    door: DoorOpening, wall: WallSegment, floor_points: Sequence[Vec2], radius_m: float
) -> LineString:
    """Possible person-centre entry locations, one radius inside the door opening.

    Trim a radius off both jambs. A tiny inset avoids round-off at exact-width
    thresholds. The caller checks these locations against obstacle-free space.
    """
    if not isfinite(radius_m) or radius_m <= 0:
        raise SpatialInputError("Entry radius must be finite and positive")
    frame = _door_frame(door, wall, floor_points)
    if door.width_m < 2 * radius_m:
        return LineString()
    tx = (frame.endpoint[0] - frame.hinge[0]) / door.width_m
    tz = (frame.endpoint[1] - frame.hinge[1]) / door.width_m
    inset = radius_m + 1e-9
    points = [
        (
            frame.hinge[0] + along * tx + inset * frame.inward_normal[0],
            frame.hinge[1] + along * tz + inset * frame.inward_normal[1],
        )
        for along in (radius_m, door.width_m - radius_m)
    ]
    return LineString(points)


def door_swing_sector(
    door: DoorOpening, wall: WallSegment, floor_points: Sequence[Vec2]
) -> Polygon:
    """Conservative zero-thickness door sweep, using stored opening conventions.

    Validate wall/closed leaf on the floor boundary within POSITION_TOLERANCE_M. Support angles
    0..180 degrees; zero returns an empty sweep. Arc tangents at intervals of at
    most one degree bound the sector from outside (radial excess <= about
    0.000039 * door width). No handle or access margin is added.
    """
    frame = _door_frame(door, wall, floor_points)
    hinge, endpoint, start = frame.hinge, frame.endpoint, frame.start_angle
    if door.swing_angle_deg == 0:
        return Polygon()

    steps = ceil(door.swing_angle_deg)
    step = frame.swing_sign * radians(door.swing_angle_deg) / steps
    tangent_radius = door.width_m / cos(abs(step) / 2)
    points = [hinge, endpoint]
    for index in range(steps):
        angle = start + (index + 0.5) * step
        points.append(
            (hinge[0] + tangent_radius * cos(angle), hinge[1] + tangent_radius * sin(angle))
        )
    end = start + steps * step
    points.append((hinge[0] + door.width_m * cos(end), hinge[1] + door.width_m * sin(end)))
    sector = Polygon(points)
    if not sector.is_valid or not isfinite(sector.area) or sector.area <= 0:
        raise SpatialInputError("Door sweep must have valid geometry with finite, positive area")
    return sector


def window_plan_segment(window: WindowOpening, wall: WallSegment) -> LineString:
    """The opening's extent along its wall's interior face, in room X/Z coordinates."""
    dx, dz = wall.end.x - wall.start.x, wall.end.z - wall.start.z
    length = hypot(dx, dz)
    values = (dx, dz, window.offset_along_wall_m, window.width_m)
    if not all(isfinite(value) for value in values) or length <= 1e-8 or window.width_m <= 0:
        raise SpatialInputError("Window and wall geometry must be finite with positive size")
    tx, tz = dx / length, dz / length
    start = (
        wall.start.x + tx * window.offset_along_wall_m,
        wall.start.z + tz * window.offset_along_wall_m,
    )
    return LineString([start, (start[0] + tx * window.width_m, start[1] + tz * window.width_m)])


def room_floor_polygon(points: Sequence[Vec2]) -> Polygon:
    """Build the usable interior floor, accepting either winding and a closed ring.

    Reject invalid geometry instead of silently repairing the room boundary.
    """
    if len(points) < 3 or not all(isfinite(v) for point in points for v in (point.x, point.z)):
        raise SpatialInputError("Room floor requires at least three finite X/Z points")
    polygon = Polygon([(point.x, point.z) for point in points])
    if not polygon.is_valid or not isfinite(polygon.area) or polygon.area <= 0:
        raise SpatialInputError("Room floor must be a valid polygon with finite, positive area")
    return polygon


def furniture_footprint(item: FurnitureItem) -> Polygon:
    """Return the rotated width/depth rectangle in room X/Z coordinates.

    Pose is the bounding-box bottom-centre. Positive yaw matches Three.js +Y
    rotation: the local front (+Z) faces +X at 90 degrees. Height and mesh shape
    do not affect this conservative floor footprint. The item is never modified.

    Raises ValueError for non-finite placement or non-positive/non-finite planar
    dimensions, including coordinates that overflow during transformation.
    """
    width, depth = item.bbox_m.width, item.bbox_m.depth
    if not all(isfinite(value) and value > 0 for value in (width, depth)):
        raise SpatialInputError("Furniture width and depth must be finite and positive")
    if not all(isfinite(value) for value in (item.pose.x, item.pose.z, item.pose.yaw_deg)):
        raise SpatialInputError("Furniture position and yaw must be finite")

    angle = radians(item.pose.yaw_deg % 360)
    c, s = cos(angle), sin(angle)
    corners = [
        (-width / 2, -depth / 2),
        (width / 2, -depth / 2),
        (width / 2, depth / 2),
        (-width / 2, depth / 2),
    ]
    points = [(item.pose.x + x * c + z * s, item.pose.z - x * s + z * c) for x, z in corners]
    if not all(isfinite(value) for point in points for value in point):
        raise SpatialInputError("Furniture footprint coordinates must be finite")
    footprint = Polygon(points)
    if not footprint.is_valid or not isfinite(footprint.area) or footprint.area <= 0:
        raise SpatialInputError(
            "Furniture footprint must have finite, positive area and valid geometry"
        )
    return footprint


def door_center(
    door: DoorOpening, wall: WallSegment, floor_points: Sequence[Vec2]
) -> tuple[float, float]:
    """The middle of a closed door, on the wall's interior face."""
    frame = _door_frame(door, wall, floor_points)
    return (
        (frame.hinge[0] + frame.endpoint[0]) / 2,
        (frame.hinge[1] + frame.endpoint[1]) / 2,
    )
`,o=`"""Door-seeded walking-space approximation, separate from geometric free area."""

from math import isfinite

from shapely.geometry import LineString, Polygon  # type: ignore[import-untyped]
from shapely.ops import unary_union  # type: ignore[import-untyped]

from contracts.schema import WALK_HEADROOM_M, RoomScene
from services.spatial_engine.geometry import (
    POSITION_TOLERANCE_M,
    SceneGeometry,
    SpatialInputError,
    door_entry_segment,
    scene_geometry,
)


def calculate_reachable_floor_ratio(
    scene: RoomScene,
    *,
    passage_width_m: float = 0.5,
    _prepared: SceneGeometry | None = None,
) -> float | None:
    """Fraction of room floor coverable by a person entering through any door.

    Model the person as an upright circle, diameter passage_width_m. Erode free
    floor by its radius to find valid centre locations; retain components seeded
    through door openings, then sweep the circle over those components and clip
    to free floor. Union all doors, never sum overlapping reachable areas.

    Uses the same below-headroom part projections as free-floor calculation.
    Door-leaf obstruction is a separate finding, not an entry veto. Obstacles at
    the entry segment or in free floor determine physical passage independently.
    Doors below headroom or narrower than the person cannot seed a component.
    No doors returns None: unknown entry must not suppress other audit findings.
    No fitting/reachable entry returns zero. Fixed items and chairs block walking.

    Circular buffers use 32 segments per quadrant. A 1e-9 m radius reduction
    permits exact-width contact within numerical precision. This is a geometric
    approximation, not accessibility certification or articulated-body motion.
    The report composer exposes this metric; inputs are never modified.
    """
    if not isfinite(passage_width_m) or passage_width_m <= 2e-9:
        raise SpatialInputError("Passage width must be finite and greater than 2e-9 metres")
    prepared = scene_geometry(scene, _prepared)
    floor = prepared.floor
    if not scene.doors:
        return None
    radius = passage_width_m / 2 - 1e-9
    walls = {wall.id: wall for wall in scene.walls}
    entry_segments: list[LineString] = []
    for door in scene.doors:
        if door.wall_id not in walls:
            raise SpatialInputError(f"Door {door.id} references an unknown wall")
        entry = door_entry_segment(door, walls[door.wall_id], scene.floor_polygon, radius)
        if door.head_height_m >= WALK_HEADROOM_M and not entry.is_empty:
            entry_segments.append(entry)

    free_floor = prepared.free_floor
    centres = free_floor.buffer(-radius, quad_segs=32)
    if centres.is_empty:
        return 0.0
    regions = [centres] if isinstance(centres, Polygon) else list(centres.geoms)
    reachable = [
        region
        for region in regions
        # Reconstructed hinges sit fractionally off their wall, so allow the shared tolerance.
        if isinstance(region, Polygon)
        and any(region.distance(entry) <= POSITION_TOLERANCE_M for entry in entry_segments)
    ]
    if not reachable:
        return 0.0
    swept = unary_union(reachable).buffer(radius, quad_segs=32).intersection(free_floor)
    area = float(swept.area)
    if not isfinite(area):
        raise SpatialInputError("Reachable floor area must be finite")
    return max(0.0, min(1.0, area / float(floor.area)))
`,s=`"""Compose the implemented checks into the shared audit response."""

from contracts.schema import AuditReport, RoomScene
from services.spatial_engine.audit import (
    detect_blocked_doors,
    detect_collisions,
    detect_front_clearance,
    detect_out_of_bounds,
)
from services.spatial_engine.feng_shui_metric import calculate_feng_shui
from services.spatial_engine.geometry import SceneGeometry, scene_geometry
from services.spatial_engine.reachability import calculate_reachable_floor_ratio


def audit_scene(scene: RoomScene, *, _prepared: SceneGeometry | None = None) -> AuditReport:
    """Audit without network access or mutation; unavailable assessments stay null.

    \`feng_shui\` is null when the room has no doors or no bed or desk to judge.

    Domain-invalid geometry raises SpatialInputError for the HTTP adapter to map to 422.
    No known doors leaves reachability null while preserving other findings.
    """
    prepared = scene_geometry(scene, _prepared)
    blocked_doors = detect_blocked_doors(scene, _prepared=prepared)
    return AuditReport(
        scene_id=scene.scene_id,
        scene_revision=scene.revision,
        collisions=detect_collisions(scene.furniture, _prepared=prepared.furniture),
        out_of_bounds_item_ids=detect_out_of_bounds(scene, _prepared=prepared),
        blocked_doors=blocked_doors,
        clearance_issues=detect_front_clearance(scene, _prepared=prepared),
        walkable_floor_ratio=calculate_reachable_floor_ratio(scene, _prepared=prepared),
        glare_orientation_grounded=None,
        overall_score=None,
        glare_alerts=None,
        feng_shui=calculate_feng_shui(scene, _prepared=prepared),
    )
`;const c=`https://cdn.jsdelivr.net/pyodide/v314.0.6/full/`,l={"contracts/__init__.py":``,"contracts/schema.py":e,"services/__init__.py":``,"services/spatial_engine/__init__.py":``,"services/spatial_engine/audit.py":t,"services/spatial_engine/feng_shui_inputs.py":n,"services/spatial_engine/feng_shui_metric.py":r,"services/spatial_engine/feng_shui_score.py":i,"services/spatial_engine/geometry.py":a,"services/spatial_engine/reachability.py":o,"services/spatial_engine/report.py":s};async function u(){let{loadPyodide:e}=await import(
/* @vite-ignore */
`${c}pyodide.mjs`),t=await e({indexURL:c});await t.loadPackage([`numpy`,`shapely`,`pydantic`]);for(let[e,n]of Object.entries(l))t.FS.mkdirTree(`/engine/${e.slice(0,e.lastIndexOf(`/`))}`),t.FS.writeFile(`/engine/${e}`,n);return t.runPython(`
import json, sys
sys.path.insert(0, '/engine')
from pydantic import ValidationError
from shapely.errors import ShapelyError
from contracts.schema import RoomScene
from services.spatial_engine.geometry import SpatialInputError
from services.spatial_engine.report import audit_scene
from services.spatial_engine.feng_shui_inputs import FengShuiRequest
from services.spatial_engine.feng_shui_score import score_feng_shui

def _run(kind, body):
    try:
        if kind == 'audit':
            out = audit_scene(RoomScene.model_validate_json(body))
        else:
            out = score_feng_shui(FengShuiRequest.model_validate_json(body))
        return json.dumps({'status': 200, 'body': out.model_dump(mode='json')})
    except ValidationError as exc:
        detail = [{'loc': ['body', *e['loc']], 'msg': e['msg'], 'type': e['type']}
                  for e in exc.errors(include_input=False, include_context=False)]
        return json.dumps({'status': 422, 'body': {'detail': detail}})
    except SpatialInputError as exc:
        return json.dumps({'status': 422, 'body': {'detail': [{'loc': ['body'], 'msg': str(exc), 'type': 'value_error'}]}})
    except (ShapelyError, ArithmeticError):
        return json.dumps({'status': 422, 'body': {'detail': [{'loc': ['body'], 'msg': 'Room geometry could not be processed', 'type': 'value_error'}]}})
`),t.globals.get(`_run`)}const d=u();d.then(()=>postMessage({ready:!0}),e=>postMessage({ready:!1,error:String(e)})),onmessage=async e=>{let{id:t,kind:n,body:r}=e.data;try{let e=JSON.parse((await d)(n,r));postMessage({id:t,...e})}catch(e){postMessage({id:t,status:500,body:{detail:String(e)},fatal:!0})}};