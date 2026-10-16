extends Area2D

signal shard_collected()

var collected: bool = false
@onready var light: PointLight2D = $PointLight2D

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if not collected:
		position.y += sin(Time.get_ticks_msec() * 0.005) * 0.4

func _on_body_entered(body: Node2D) -> void:
	if not collected and body.is_in_group("player"):
		collected = true
		shard_collected.emit()
		queue_free()
