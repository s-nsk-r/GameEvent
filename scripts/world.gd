extends Node2D

@onready var player: CharacterBody2D = $Player
@onready var ui: CanvasLayer = $UI
@onready var canvas_modulate: CanvasModulate = $CanvasModulate
@onready var solar_crystals: StaticBody2D = $WorldGeometry/SolarCrystals
@onready var void_crystals: StaticBody2D = $WorldGeometry/VoidCrystals

func _ready() -> void:
	if player:
		player.dimension_swapped.connect(_on_dimension_swapped)
		player.player_died.connect(ui.record_death)

	# Connect all Beacons
	for beacon in get_tree().get_nodes_in_group("beacons"):
		beacon.beacon_activated.connect(_on_beacon_activated)

	# Connect all Shards
	for shard in get_tree().get_nodes_in_group("shards"):
		shard.shard_collected.connect(ui.add_shard)

	# Connect all Whisper Tablets
	for whisper in get_tree().get_nodes_in_group("whispers"):
		whisper.whisper_triggered.connect(ui.show_whisper)

	# Initialize Solar state
	_on_dimension_swapped("SOLAR")

func _process(_delta: float) -> void:
	if player:
		var px = player.global_position.x
		var region = "THE SUNLIT CANOPY"
		if px >= 3400:
			region = "THE CHRONO-NEXUS"
		elif px >= 2500:
			region = "THE BIOLUMINESCENT DEPTHS"
		elif px >= 1300:
			region = "THE WHISPERING RIFT"

		ui.update_region(region)

func _on_dimension_swapped(dim: String) -> void:
	ui.update_dimension(dim)
	if dim == "SOLAR":
		# Solar crystal solid, Void crystal disabled/hazard
		if solar_crystals:
			solar_crystals.set_collision_layer_value(1, true)
		if void_crystals:
			void_crystals.set_collision_layer_value(1, false)
		if canvas_modulate:
			canvas_modulate.color = Color(0.22, 0.18, 0.14) # Ambient twilight gold
	else:
		# Void crystal solid, Solar crystal disabled/hazard
		if solar_crystals:
			solar_crystals.set_collision_layer_value(1, false)
		if void_crystals:
			void_crystals.set_collision_layer_value(1, true)
		if canvas_modulate:
			canvas_modulate.color = Color(0.12, 0.16, 0.22) # Ambient deep cyan twilight

func _on_beacon_activated(beacon_name: String) -> void:
	ui.update_region("HARMONIZED: " + beacon_name)
