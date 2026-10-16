extends Area2D

signal beacon_activated(beacon_name: String)

@export var beacon_name: String = "SPIRIT BEACON"
var is_active: bool = false

@onready var light: PointLight2D = $PointLight2D
@onready var sprite: Polygon2D = $ObeliskVisual

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
	if not is_active and body.has_method("set_respawn_point"):
		is_active = true
		body.set_respawn_point(global_position + Vector2(0, -10))
		light.energy = 2.0
		light.color = Color(1.0, 0.9, 0.5, 1.0)
		beacon_activated.emit(beacon_name)
