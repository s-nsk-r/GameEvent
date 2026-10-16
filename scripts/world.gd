extends Node2D

@onready var player: CharacterBody2D = $Player
@onready var ui: CanvasLayer = $UI
@onready var canvas_modulate: CanvasModulate = $CanvasModulate
@onready var solar_platforms: Node2D = $WorldGeometry/SolarPlatforms
@onready var crimson_platforms: Node2D = $WorldGeometry/CrimsonPlatforms

func _ready() -> void:
	if player:
		player.dimension_swapped.connect(_on_dimension_swapped)
		player.player_died.connect(ui.record_death)

	if ui and player:
		ui.game_started.connect(player.unlock_input)

	# Connect all Beacons
	for beacon in get_tree().get_nodes_in_group("beacons"):
		beacon.beacon_activated.connect(_on_beacon_activated)

	# Connect all Shards
	for shard in get_tree().get_nodes_in_group("shards"):
		shard.shard_collected.connect(ui.add_shard)

	# Connect all Whisper Tablets
	for whisper in get_tree().get_nodes_in_group("whispers"):
		whisper.whisper_triggered.connect(ui.show_whisper)

	# Connect all Lanterns
	for lantern in get_tree().get_nodes_in_group("lanterns"):
		lantern.body_entered.connect(func(b):
			if b == player:
				player.bounce(-400.0)
		)

	# Connect all Hazards / Thorns
	for hazard in get_tree().get_nodes_in_group("hazards"):
		hazard.body_entered.connect(func(b):
			if b == player:
				player.kill()
		)

	# Connect Altar for Victory
	for altar in get_tree().get_nodes_in_group("altars"):
		altar.body_entered.connect(func(b):
			if b == player:
				ui.trigger_game_over(true)
		)

	# Initialize Solar State
	_on_dimension_swapped("SOLAR")

func _process(_delta: float) -> void:
	if player:
		var px = player.global_position.x
		var region = "THE SUNLIT CANOPY"
		if px >= 3400:
			region = "THE CHRONO-NEXUS"
		elif px >= 2500:
			region = "THE CRIMSON CAVERNS"
		elif px >= 1300:
			region = "THE SHADOW FAULT"

		ui.update_region(region)

func _on_dimension_swapped(dim: String) -> void:
	ui.update_dimension(dim)

	if dim == "SOLAR":
		# Solar Gold Solid (100% opacity, collision active)
		if solar_platforms:
			solar_platforms.modulate.a = 1.0
			for body in solar_platforms.get_children():
				if body is StaticBody2D:
					body.set_collision_layer_value(1, true)

		# Crimson Red Ghost (35% opacity, collision disabled - visible so player sees where to land!)
		if crimson_platforms:
			crimson_platforms.modulate.a = 0.35
			for body in crimson_platforms.get_children():
				if body is StaticBody2D:
					body.set_collision_layer_value(1, false)

		if canvas_modulate:
			canvas_modulate.color = Color(0.24, 0.19, 0.13) # Warm ambient gold
	else:
		# Crimson Red Solid (100% opacity, collision active)
		if crimson_platforms:
			crimson_platforms.modulate.a = 1.0
			for body in crimson_platforms.get_children():
				if body is StaticBody2D:
					body.set_collision_layer_value(1, true)

		# Solar Gold Ghost (35% opacity, collision disabled)
		if solar_platforms:
			solar_platforms.modulate.a = 0.35
			for body in solar_platforms.get_children():
				if body is StaticBody2D:
					body.set_collision_layer_value(1, false)

		if canvas_modulate:
			canvas_modulate.color = Color(0.18, 0.08, 0.10) # Deep obsidian crimson

func _on_beacon_activated(beacon_name: String) -> void:
	ui.update_region("HARMONIZED: " + beacon_name)
