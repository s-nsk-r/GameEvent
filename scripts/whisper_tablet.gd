extends Area2D

signal whisper_triggered(title: String, text: String)

@export var whisper_title: String = "ANCIENT WHISPER"
@export_multiline var whisper_text: String = "Two worlds touch without speaking..."

var player_in_range: bool = false

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

func _unhandled_input(event: InputEvent) -> void:
	if player_in_range and (event.is_action_pressed("move_down") or event.is_action_pressed("jump")):
		whisper_triggered.emit(whisper_title, whisper_text)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_in_range = true

func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_in_range = false
