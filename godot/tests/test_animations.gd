extends SceneTree

const Arena = preload("res://scripts/arena.gd")
const Model = preload("res://scripts/battle_model.gd")
var failures := 0
var scenarios := 0

func check(condition: bool, message: String) -> void:
	if not condition:
		failures += 1
		printerr("ANIMATION FAIL: ",message)

func _initialize() -> void:
	run.call_deferred()

func run() -> void:
	var arena = Arena.new()
	arena.model = Model.new(42)
	root.add_child(arena)
	arena.set_process(false)
	var counts := {"strike":1,"blast":4,"beam":1,"superBeam":1,"kienzan":1,"charge":0,"guard":0,"evade":0,"transform":0,"gogeta":0}
	for form in ["base","ssj","gogetaSSJ"]:
		arena.player_form = form
		for key in counts:
			scenarios += 1
			arena.play_goku("player",key)
			for i in range(700):
				arena.advance(0.01)
				if not arena.busy: break
			check(not arena.busy and arena.events.is_empty() and arena.effects.is_empty(),form+"/"+key+" must complete")
			check(arena.impacts == counts[key],form+"/"+key+" damage events")
			check(arena.anchor("player") == Vector2(290,390),"return to origin")
			if key == "kienzan": check(arena.target_impacts == 3,"three Kienzan impacts")
			if key == "strike": check(arena.target_impacts == 8,"eight combo flashes with one damage event")
	for key in arena.cell:
		scenarios += 1
		arena.play_cell(key)
		for i in range(1000):
			arena.advance(0.01)
			if not arena.busy: break
		check(not arena.busy and arena.effects.is_empty(),"Cell/"+key+" must complete")
		check(arena.impacts == 0,"Cell lab has visual impacts only")
	arena.player_form = "base"
	arena.play_goku("player","kienzan")
	var casts := 0
	for e in arena.events:
		if e.kind == "pose":
			casts += 1
			check(e.frames.size() == 9,"Kienzan restarts all nine frames")
	check(casts == 2 and arena.poses.player.frames.size() == 9,"three complete Kienzan casts including initial pose")
	arena.play_goku("player","blast")
	arena.advance(0.45)
	check(not arena.effects.is_empty(),"active projectile before pause")
	arena.paused = true
	var previous: float = arena.time
	arena._process(0.5)
	check(arena.time == previous,"pause freezes clock")
	arena.step_frame()
	check(is_equal_approx(arena.time,previous+1.0/60),"step advances clock")
	arena.reset_visuals()
	arena.advance(10)
	check(arena.effects.is_empty() and arena.events.is_empty() and arena.impacts == 0,"reset cancels future impacts")
	arena.player_form = "gogetaSSJ"
	arena.play_goku("player","blast")
	check(arena.poses.player.frames == arena.goku.gogetaIdle,"Gogeta never borrows Goku base poses")
	print("Godot animations: ",scenarios," sequences plus Kienzan/pause/step/reset/form checks; failures=",failures)
	arena.queue_free()
	quit(1 if failures else 0)
