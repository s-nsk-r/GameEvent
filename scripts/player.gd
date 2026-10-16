extends CharacterBody2D

signal dimension_swapped(new_dimension: String)
signal player_died()

# Ori Physics Tuning (Athletic, Graceful, Responsive)
@export var speed: float = 210.0
@export var acceleration: float = 1400.0
@export var friction: float = 1600.0
@export var jump_velocity: float = -360.0
@export var double_jump_velocity: float = -330.0
@export var gravity: float = 980.0
@export var max_fall_speed: float = 420.0

# Feather Float (Hold Space while falling)
@export var float_gravity: float = 180.0
@export var float_fall_speed: float = 90.0

# Wall Mechanics
@export var wall_slide_speed: float = 85.0
@export var wall_jump_velocity: Vector2 = Vector2(260.0, -330.0)

# Dimension State: "SOLAR" (Gold) or "CRIMSON" (Red/Black)
var dimension: String = "SOLAR"
var coyote_time: float = 0.0
var jump_buffer: float = 0.0
var jumps_left: int = 2
var wall_lockout: float = 0.0
var facing_direction: float = 1.0
var is_dead: bool = false
var is_input_locked: bool = true
var respawn_pos: Vector2 = Vector2(180, 410)

@onready var visual_root: Node2D = $VisualRoot
@onready var light: PointLight2D = $PointLight2D
@onready var trail_particles: CPUParticles2D = $VisualRoot/TrailParticles
@onready var aura: Polygon2D = $VisualRoot/SpiritAura

func _ready() -> void:
	respawn_pos = global_position
	update_dimension_visuals()

func unlock_input() -> void:
	is_input_locked = false

func lock_input() -> void:
	is_input_locked = true
	velocity.x = 0.0

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	if is_input_locked:
		velocity.y = move_toward(velocity.y, max_fall_speed, gravity * delta)
		move_and_slide()
		return

	# Grounding & Coyote Time
	if is_on_floor():
		coyote_time = 0.12
		jumps_left = 2
	else:
		coyote_time = max(0.0, coyote_time - delta)

	# Jump Buffer on Space
	if Input.is_action_just_pressed("jump_space"):
		jump_buffer = 0.12
	else:
		jump_buffer = max(0.0, jump_buffer - delta)

	if wall_lockout > 0.0:
		wall_lockout = max(0.0, wall_lockout - delta)

	# Z Key: Dimension Change (Solar Gold <-> Crimson Red/Black)
	if Input.is_action_just_pressed("action_z"):
		trigger_dimension_change()

	process_movement(delta)
	process_wall_mechanics(delta)
	process_jumping(delta)

	# Squash & Stretch recovery (Ori springiness)
	visual_root.scale = visual_root.scale.lerp(Vector2.ONE, 14.0 * delta)

	move_and_slide()

func trigger_dimension_change() -> void:
	dimension = "CRIMSON" if dimension == "SOLAR" else "SOLAR"
	visual_root.scale = Vector2(1.3, 0.75) # Pulse stretch on shift
	update_dimension_visuals()
	dimension_swapped.emit(dimension)

func process_movement(delta: float) -> void:
	var move_input = Input.get_axis("move_left", "move_right")

	if move_input != 0.0:
		facing_direction = sign(move_input)
		visual_root.scale.x = abs(visual_root.scale.x) * facing_direction

		if wall_lockout <= 0.0:
			velocity.x = move_toward(velocity.x, move_input * speed, acceleration * delta)
	else:
		if wall_lockout <= 0.0:
			velocity.x = move_toward(velocity.x, 0.0, friction * delta)

	# Gravity & Feather Glide (Holding Space while descending)
	var current_gravity = gravity
	if not is_on_floor() and Input.is_action_pressed("jump_space") and velocity.y > 0.0:
		current_gravity = float_gravity
		velocity.y = min(velocity.y, float_fall_speed)

	velocity.y = move_toward(velocity.y, max_fall_speed, current_gravity * delta)

func process_wall_mechanics(_delta: float) -> void:
	if not is_on_floor() and is_on_wall():
		jumps_left = 2

		# Slide damping on walls
		if velocity.y > wall_slide_speed:
			velocity.y = wall_slide_speed

func process_jumping(_delta: float) -> void:
	if jump_buffer > 0.0:
		if coyote_time > 0.0:
			# Normal Ground Jump
			velocity.y = jump_velocity
			jump_buffer = 0.0
			coyote_time = 0.0
			jumps_left = 1
			visual_root.scale = Vector2(0.7, 1.4)
		elif not is_on_floor() and is_on_wall():
			# Wall Leap
			var wall_normal = get_wall_normal()
			velocity.x = wall_normal.x * wall_jump_velocity.x
			velocity.y = wall_jump_velocity.y
			wall_lockout = 0.16
			jump_buffer = 0.0
			jumps_left = 1
			facing_direction = sign(wall_normal.x)
			visual_root.scale = Vector2(0.75, 1.35)
		elif jumps_left > 0:
			# Double Jump (Acrobatic Flip)
			velocity.y = double_jump_velocity
			jump_buffer = 0.0
			jumps_left = 0
			visual_root.scale = Vector2(1.3, 0.7)

	# Variable Jump Cut (Release early for short hop)
	if Input.is_action_just_released("jump_space") and velocity.y < -60.0:
		velocity.y *= 0.52

func bounce(impulse: float = -380.0) -> void:
	velocity.y = impulse
	jumps_left = 2
	visual_root.scale = Vector2(0.65, 1.5)

func refresh_abilities() -> void:
	jumps_left = 2

func set_respawn_point(new_pos: Vector2) -> void:
	respawn_pos = new_pos

func kill() -> void:
	if is_dead:
		return
	is_dead = true
	player_died.emit()
	hide()
	await get_tree().create_timer(0.4).timeout
	respawn()

func respawn() -> void:
	global_position = respawn_pos
	velocity = Vector2.ZERO
	jumps_left = 2
	is_dead = false
	visual_root.scale = Vector2.ONE
	show()

func update_dimension_visuals() -> void:
	if light == null:
		return
	if dimension == "SOLAR":
		# Radiant Sunlit Gold
		light.color = Color(1.0, 0.75, 0.15, 0.95)
		if aura:
			aura.color = Color(1.0, 0.75, 0.15, 0.95)
		if trail_particles:
			trail_particles.modulate = Color(1.0, 0.8, 0.2, 0.8)
	else:
		# Glowing Crimson Eclipse (Red & Black)
		light.color = Color(1.0, 0.12, 0.25, 0.95)
		if aura:
			aura.color = Color(1.0, 0.15, 0.25, 0.95)
		if trail_particles:
			trail_particles.modulate = Color(1.0, 0.2, 0.3, 0.8)
