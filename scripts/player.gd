extends CharacterBody2D

signal dimension_swapped(new_dimension: String)
signal player_died()

# Movement Parameters (Ori-Tuned, AGENTS.md Compliant)
@export var speed: float = 190.0
@export var acceleration: float = 1200.0
@export var friction: float = 1400.0
@export var jump_velocity: float = -340.0
@export var double_jump_velocity: float = -310.0
@export var gravity: float = 950.0
@export var max_fall_speed: float = 400.0

# Feather Float (Glide with Up Arrow held)
@export var float_gravity: float = 160.0
@export var float_fall_speed: float = 85.0

# Wall Mechanics
@export var wall_slide_speed: float = 80.0
@export var wall_jump_velocity: Vector2 = Vector2(240.0, -320.0)

# Biphase Air-Dash (Action Z - Primary Action)
@export var dash_speed: float = 520.0
@export var dash_duration: float = 0.18

# Dimension Phase (Action Space - Secondary Action)
# Rule 1: "Space must never be needed more than about once every 2 seconds, and never needs to be held for long"
var phase_cooldown: float = 0.0
var max_phase_cooldown: float = 2.0

# State Variables
var dimension: String = "SOLAR" # "SOLAR" or "VOID"
var coyote_time: float = 0.0
var jump_buffer: float = 0.0
var jumps_left: int = 2
var can_dash: bool = true
var is_dashing: bool = false
var dash_timer: float = 0.0
var dash_direction: Vector2 = Vector2.RIGHT
var wall_lockout: float = 0.0
var facing_direction: float = 1.0
var is_dead: bool = false
var respawn_pos: Vector2 = Vector2(180, 410)

@onready var visual_root: Node2D = $VisualRoot
@onready var light: PointLight2D = $PointLight2D
@onready var trail_particles: CPUParticles2D = $VisualRoot/TrailParticles

func _ready() -> void:
	respawn_pos = global_position
	update_dimension_visuals()

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Timers
	if phase_cooldown > 0.0:
		phase_cooldown = max(0.0, phase_cooldown - delta)

	if is_on_floor():
		coyote_time = 0.12 # Generous coyote time
		jumps_left = 2
		can_dash = true
	else:
		coyote_time = max(0.0, coyote_time - delta)

	# Jump Buffer on Up Arrow
	if Input.is_action_just_pressed("jump_up"):
		jump_buffer = 0.12
	else:
		jump_buffer = max(0.0, jump_buffer - delta)

	if wall_lockout > 0.0:
		wall_lockout = max(0.0, wall_lockout - delta)

	# Secondary Action: Dimension Phase on Space (rate-limited to 2s per Rule 1)
	if Input.is_action_just_pressed("phase_space") and phase_cooldown <= 0.0:
		trigger_dimension_phase()

	# Primary Action: Air-Dash on Z
	if Input.is_action_just_pressed("action_z") and can_dash and not is_dashing:
		start_phase_dash()

	if is_dashing:
		process_dash(delta)
	else:
		process_movement(delta)
		process_wall_mechanics(delta)
		process_jumping(delta)

	# Squash & Stretch recovery
	visual_root.scale = visual_root.scale.lerp(Vector2.ONE, 12.0 * delta)

	move_and_slide()

func trigger_dimension_phase() -> void:
	phase_cooldown = max_phase_cooldown
	dimension = "VOID" if dimension == "SOLAR" else "SOLAR"
	update_dimension_visuals()
	dimension_swapped.emit(dimension)

func start_phase_dash() -> void:
	is_dashing = true
	can_dash = false
	dash_timer = dash_duration

	var input_dir = Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)

	if input_dir.length_squared() > 0.1:
		dash_direction = input_dir.normalized()
	else:
		dash_direction = Vector2(facing_direction, 0.0)

	velocity = dash_direction * dash_speed
	visual_root.scale = Vector2(1.5, 0.6)

func process_dash(delta: float) -> void:
	dash_timer -= delta
	velocity = dash_direction * dash_speed

	if dash_timer <= 0.0:
		is_dashing = false
		velocity *= 0.4

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

	# Gravity and Feather Glide with Up Arrow
	var current_gravity = gravity
	if not is_on_floor() and Input.is_action_pressed("jump_up") and velocity.y > 0.0:
		current_gravity = float_gravity
		velocity.y = min(velocity.y, float_fall_speed)

	velocity.y = move_toward(velocity.y, max_fall_speed, current_gravity * delta)

func process_wall_mechanics(_delta: float) -> void:
	if not is_on_floor() and is_on_wall():
		can_dash = true
		jumps_left = 2

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
			wall_lockout = 0.15
			jump_buffer = 0.0
			jumps_left = 1
			facing_direction = sign(wall_normal.x)
			visual_root.scale = Vector2(0.75, 1.35)
		elif jumps_left > 0:
			# Double Jump
			velocity.y = double_jump_velocity
			jump_buffer = 0.0
			jumps_left = 0
			visual_root.scale = Vector2(1.3, 0.7)

	if Input.is_action_just_released("jump_up") and velocity.y < -50.0:
		velocity.y *= 0.5

func refresh_abilities() -> void:
	can_dash = true
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
	is_dashing = false
	can_dash = true
	jumps_left = 2
	is_dead = false
	visual_root.scale = Vector2.ONE
	show()

func update_dimension_visuals() -> void:
	if light == null:
		return
	if dimension == "SOLAR":
		light.color = Color(1.0, 0.7, 0.1, 0.9)
		if trail_particles:
			trail_particles.color = Color(1.0, 0.75, 0.1, 0.8)
	else:
		light.color = Color(0.0, 0.9, 1.0, 0.9)
		if trail_particles:
			trail_particles.color = Color(0.0, 0.9, 1.0, 0.8)
