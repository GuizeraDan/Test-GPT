extends SceneTree
const Model = preload("res://scripts/battle_model.gd")
var failures := 0

func snapshot(m) -> Dictionary:
	var result := {"turn":m.state.turn,"round":m.state.round,"actions":m.state.actions,"winner":m.state.winner,"pending":not m.pending.is_empty()}
	for side in ["player","enemy"]:
		var f: Dictionary = m.state[side]
		var out := {}
		for key in ["hp","ki","shield","reaction","transformed","form"]: out[key] = f[key]
		for key in ["hand","deck","discard"]:
			out[key] = f[key].duplicate()
			out[key].sort()
		result[side] = out
	return result

func _initialize() -> void:
	var fixtures: Array = JSON.parse_string(FileAccess.get_file_as_string("res://tests/parity.json"))
	for fixture in fixtures:
		var model = Model.new(42)
		model.state = fixture.initial.duplicate(true)
		for i in range(fixture.ops.size()):
			var op: Dictionary = fixture.ops[i]
			var result = null
			match op.kind:
				"play": result = model.play(op.side,int(op.index))
				"begin": result = model.begin_card(op.side,int(op.index))
				"end": model.end_turn()
				"impact":
					model.impact()
					if model.pending.resolved == model.pending.hits: model.finish_card()
			var actual: Dictionary = JSON.parse_string(JSON.stringify(snapshot(model)))
			if result != fixture.expected[i].result or actual != fixture.expected[i].state:
				failures += 1
				printerr("PARITY FAIL ",fixture.name," step ",i,"\n",JSON.stringify(actual),"\nexpected ",JSON.stringify(fixture.expected[i].state))
	print("Godot model parity: ",fixtures.size()," scenarios; failures=",failures)
	quit(1 if failures else 0)
