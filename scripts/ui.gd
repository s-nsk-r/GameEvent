extends CanvasLayer

@onready var region_label: Label = $HUD/MarginContainer/HBoxContainer/RegionLabel
@onready var timer_label: Label = $HUD/MarginContainer/HBoxContainer/TimerLabel
@onready var shard_label: Label = $HUD/MarginContainer/HBoxContainer/ShardLabel
@onready var dimension_label: Label = $HUD/MarginContainer/HBoxContainer/DimensionLabel
@onready var dialog_panel: Panel = $DialogPanel
@onready var dialog_title: Label = $DialogPanel/Margin/VBox/TitleLabel
@onready var dialog_text: Label = $DialogPanel/Margin/VBox/TextLabel

var elapsed_time: float = 0.0
var deaths: int = 0
var shards: int = 0
var is_dialog_open: bool = false

func _ready() -> void:
	dialog_panel.hide()

func _process(delta: float) -> void:
	if not is_dialog_open:
		elapsed_time += delta
		var total_sec = int(elapsed_time)
		var mins = total_sec / 60
		var secs = total_sec % 60
		var ms = int((elapsed_time - total_sec) * 100)
		timer_label.text = "%02d:%02d.%02d | 💀 %d" % [mins, secs, ms, deaths]

func _unhandled_input(event: InputEvent) -> void:
	if is_dialog_open and event.is_action_pressed("action_z"):
		close_dialog()

func update_region(region_name: String) -> void:
	region_label.text = region_name

func update_dimension(dim: String) -> void:
	if dim == "SOLAR":
		dimension_label.text = "[SOLAR // GOLD]"
		dimension_label.modulate = Color(1.0, 0.7, 0.1)
	else:
		dimension_label.text = "[VOID // CYAN]"
		dimension_label.modulate = Color(0.0, 0.9, 1.0)

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
