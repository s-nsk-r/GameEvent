extends CanvasLayer

signal game_started()

@onready var hud: Control = $HUD
@onready var region_label: Label = $HUD/MarginContainer/HBoxContainer/RegionLabel
@onready var timer_label: Label = $HUD/MarginContainer/HBoxContainer/TimerLabel
@onready var shard_label: Label = $HUD/MarginContainer/HBoxContainer/ShardLabel
@onready var dimension_label: Label = $HUD/MarginContainer/HBoxContainer/DimensionLabel

@onready var dialog_panel: Panel = $DialogPanel
@onready var dialog_title: Label = $DialogPanel/Margin/VBox/TitleLabel
@onready var dialog_text: Label = $DialogPanel/Margin/VBox/TextLabel

@onready var title_panel: Panel = $TitlePanel
@onready var game_over_panel: Panel = $GameOverPanel
@onready var game_over_title: Label = $GameOverPanel/Margin/VBox/TitleLabel
@onready var game_over_score: Label = $GameOverPanel/Margin/VBox/ScoreLabel
@onready var game_over_prompt: Label = $GameOverPanel/Margin/VBox/PromptLabel

var elapsed_time: float = 0.0
var deaths: int = 0
var shards: int = 0
var is_dialog_open: bool = false
var is_title_screen: bool = true
var is_game_over: bool = false
var game_over_lockout: float = 0.0

func _ready() -> void:
	dialog_panel.hide()
	game_over_panel.hide()
	title_panel.show()
	is_title_screen = true

func _process(delta: float) -> void:
	if not is_title_screen and not is_dialog_open and not is_game_over:
		elapsed_time += delta
		var total_sec = int(elapsed_time)
		var mins = total_sec / 60
		var secs = total_sec % 60
		var ms = int((elapsed_time - total_sec) * 100)
		timer_label.text = "%02d:%02d.%02d | 💀 %d" % [mins, secs, ms, deaths]

	if is_game_over and game_over_lockout > 0.0:
		game_over_lockout = max(0.0, game_over_lockout - delta)
		if game_over_lockout == 0.0:
			game_over_prompt.text = "PRESS Z TO PLAY AGAIN"
			game_over_prompt.modulate = Color(1.0, 0.75, 0.15)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("action_z"):
		if is_title_screen:
			# Rule 4: Fresh press of Z to start game
			is_title_screen = false
			title_panel.hide()
			game_started.emit()
		elif is_dialog_open:
			# Rule 1: Confirm / close on Z
			close_dialog()
		elif is_game_over:
			# Rule 2: Ignore Z for first 1.0 second of game-over screen
			if game_over_lockout <= 0.0:
				get_tree().reload_current_scene()

func update_region(region_name: String) -> void:
	region_label.text = region_name

func update_dimension(dim: String) -> void:
	if dim == "SOLAR":
		dimension_label.text = "[SOLAR // GOLD]"
		dimension_label.modulate = Color(1.0, 0.75, 0.15)
	else:
		dimension_label.text = "[CRIMSON // RED]"
		dimension_label.modulate = Color(1.0, 0.12, 0.25)

func add_shard() -> void:
	shards += 1
	shard_label.text = "💎 %d/20" % shards

func record_death() -> void:
	deaths += 1

func show_whisper(title: String, text: String) -> void:
	dialog_title.text = "// " + title
	dialog_text.text = text
	dialog_panel.show()
	is_dialog_open = true

func close_dialog() -> void:
	dialog_panel.hide()
	is_dialog_open = false

func trigger_game_over(victory: bool = false) -> void:
	is_game_over = true
	game_over_lockout = 1.0 # 1.0s lockout per Rule 2
	game_over_title.text = "ANCESTRAL CONVERGENCE" if victory else "FRACTURE COLLAPSE"
	game_over_title.modulate = Color(1.0, 0.75, 0.15) if victory else Color(1.0, 0.1, 0.2)
	
	var total_sec = int(elapsed_time)
	var mins = total_sec / 60
	var secs = total_sec % 60
	game_over_score.text = "TIME: %02d:%02d  |  DEATHS: %d  |  SHARDS: %d/20" % [mins, secs, deaths, shards]
	game_over_prompt.text = "RECALIBRATING RESONANCE..."
	game_over_prompt.modulate = Color(0.6, 0.6, 0.6)
	game_over_panel.show()
