extends Area2D

var cooldown: float = 0.0
@onready var light: PointLight2D = $PointLight2D
@onready var visual: Polygon2D = $Visual

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if cooldown > 0.0:
		cooldown -= delta
		visual.modulate.a = 0.4
		light.energy = 0.4
	else:
		visual.modulate.a = 1.0
		light.energy = 1.4

func _on_body_entered(body: Node2D) -> void:
	if cooldown <= 0.0 and body.has_method("refresh_abilities"):
		cooldown = 1.0
		body.refresh_abilities()
		# Slight upward/forward impulse to player for fluid traversal
		if "velocity" in body:
			body.velocity.y = min(body.velocity.y, -260.0)
