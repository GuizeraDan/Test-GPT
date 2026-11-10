extends Control

const Model = preload("res://scripts/battle_model.gd")
const Arena = preload("res://scripts/arena.gd")
var model = Model.new()
var arena: DuelArena
var mode: OptionButton
var actor: OptionButton
var opponent: OptionButton
var form: OptionButton
var skill: OptionButton
var rate: OptionButton
var play_button: Button
var pause_button: Button
var step_button: Button
var end_button: Button
var status: Label
var note: Label
var hand: HBoxContainer
var cpu_wait := 0.5
var is_lab := true
var test_bridge := false
var bridge_timer := 0.0

func _ready() -> void:
	build_ui()
	arena.model = model
	arena.hit.connect(on_hit)
	arena.completed.connect(on_completed)
	reset_session()
	if OS.has_feature("web"):
		test_bridge = bool(JavaScriptBridge.eval("new URLSearchParams(location.search).has('test')"))

func button(text: String, callback: Callable, parent: Node) -> Button:
	var result := Button.new()
	result.text = text
	result.custom_minimum_size.y = 42
	result.pressed.connect(callback)
	parent.add_child(result)
	return result

func label(text: String, parent: Node, font_size: int = 17) -> Label:
	var result := Label.new()
	result.text = text
	result.add_theme_font_size_override("font_size",font_size)
	parent.add_child(result)
	return result

func select(items: Array, parent: Node, width: float = 150) -> OptionButton:
	var result := OptionButton.new()
	result.custom_minimum_size = Vector2(width,42)
	for item in items: result.add_item(item)
	parent.add_child(result)
	return result

func make_theme() -> Theme:
	var result := Theme.new()
	result.default_font_size = 17
	for type in ["Button","OptionButton"]:
		for state in ["normal","hover","pressed","disabled","focus"]:
			var style := StyleBoxFlat.new()
			style.bg_color = Color("244652") if state in ["hover","pressed"] else Color("142e38") if state != "disabled" else Color("152329")
			style.border_color = Color("ffb74c") if state in ["pressed","focus"] else Color("426470")
			style.set_border_width_all(1)
			style.set_corner_radius_all(6)
			style.content_margin_left = 14
			style.content_margin_right = 14
			style.content_margin_top = 8
			style.content_margin_bottom = 8
			result.set_stylebox(state,type,style)
	return result

func build_ui() -> void:
	theme = make_theme()
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left","right","top","bottom"]: margin.add_theme_constant_override("margin_"+side,20)
	add_child(margin)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	margin.add_child(column)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation",20)
	column.add_child(header)
	var title := label("KAME DUEL",header,30)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label("GODOT · MIGRAÇÃO 01",header,15).modulate = Color("ffc467")
	mode = select(["Laboratório","Partida por turnos"],header,210)
	mode.item_selected.connect(func(index): is_lab = index == 0; reset_session())
	var roster := HBoxContainer.new()
	roster.add_theme_constant_override("separation",12)
	column.add_child(roster)
	label("Jogável: Goku",roster)
	form = select(["Base","Super Saiyajin","Gogeta SSJ"],roster,170)
	form.item_selected.connect(func(_i): reset_session())
	label("Inimigo",roster)
	opponent = select(["Cell Perfeito","Vegeta"],roster,180)
	opponent.item_selected.connect(func(_i): reset_session())
	label("Reproduzir",roster)
	actor = select(["Personagem","Inimigo"],roster,160)
	actor.item_selected.connect(func(_i): reset_session())
	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation",10)
	column.add_child(controls)
	skill = select([],controls,270)
	skill.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_button = button("Reproduzir",play_selected,controls)
	pause_button = button("Pausar",func(): arena.paused = not arena.paused; refresh(),controls)
	step_button = button("Avançar 1/60 s",func(): arena.step_frame(); refresh(),controls)
	rate = select(["0,5×","1×","2×"],controls,90)
	rate.select(1)
	rate.item_selected.connect(func(i): arena.speed = [0.5,1.0,2.0][i])
	button("Reiniciar",reset_session,controls)
	arena = Arena.new()
	arena.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(arena)
	var info := HBoxContainer.new()
	column.add_child(info)
	status = label("Pronto",info,20)
	status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	end_button = button("Encerrar turno",end_player_turn,info)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size.y = 208
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)
	hand = HBoxContainer.new()
	hand.add_theme_constant_override("separation",10)
	scroll.add_child(hand)
	note = label("",column,14)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

func selected_form() -> String:
	return ["base","ssj","gogetaSSJ"][form.selected] if is_lab else model.state.player.form

func update_skills() -> void:
	var old = skill.get_item_metadata(skill.selected) if skill.selected >= 0 else ""
	skill.clear()
	if is_lab and actor.selected == 1 and opponent.selected == 0:
		for key in arena.cell:
			if not arena.cell[key].has("name") or not arena.cell[key].name.contains(" ") and key in ["073","114","115","121","122","123","124","153","projectile"]: continue
			skill.add_item(arena.cell[key].name)
			skill.set_item_metadata(skill.item_count-1,key)
	else:
		skill.add_item("Postura / Idle")
		skill.set_item_metadata(0,"idle")
		for key in model.cards:
			skill.add_item(model.cards[key].name)
			skill.set_item_metadata(skill.item_count-1,key)
	for i in range(skill.item_count):
		if skill.get_item_metadata(i) == old: skill.select(i)

func reset_session() -> void:
	arena.reset_visuals()
	model.reset()
	arena.enemy_character = "cell" if is_lab and opponent.selected == 0 else "vegeta"
	arena.player_form = selected_form()
	arena.enemy_form = "base"
	if is_lab:
		model.state.enemy.name = "Cell Perfeito" if opponent.selected == 0 else "Vegeta"
		model.state.player.form = selected_form()
		model.state.player.transformed = selected_form() != "base"
		model.state.player.ki = 8
		model.state.enemy.ki = 8
		model.state.player.hand = model.cards.keys()
		model.state.enemy.hand = model.cards.keys()
		model.state.turn = "player" if actor.selected == 0 else "enemy"
	cpu_wait = 0.5
	update_skills()
	refresh()

func play_selected() -> void:
	if not is_lab or arena.busy: return
	var key: String = skill.get_item_metadata(skill.selected)
	reset_session()
	var side := "player" if actor.selected == 0 else "enemy"
	if side == "enemy" and opponent.selected == 0:
		arena.play_cell(key)
	elif key == "idle":
		arena.play_goku(side,key)
	else:
		if key in ["transform","gogeta"]:
			model.state[side].form = "base"
			model.state[side].transformed = false
			arena.player_form = "base" if side == "player" else arena.player_form
		start_card(side,model.state[side].hand.find(key))
	refresh()

func start_card(side: String, index: int) -> void:
	if arena.busy or not model.can_play(side,index): return
	var key: String = model.state[side].hand[index]
	if model.begin_card(side,index):
		arena.play_goku(side,key)
		refresh()

func on_hit(_side: String) -> void:
	var result: Dictionary = model.impact()
	if not result.is_empty(): arena.last_damage = "−%d VIDA · impacto %d" % [result.damage,result.hit]
	refresh()

func on_completed() -> void:
	if not model.pending.is_empty(): model.finish_card()
	arena.player_form = model.state.player.form
	arena.enemy_form = model.state.enemy.form
	cpu_wait = 0.45
	refresh()

func end_player_turn() -> void:
	if is_lab or arena.busy or model.state.turn != "player": return
	model.end_turn()
	cpu_wait = 0.55
	refresh()

func refresh() -> void:
	var locked: bool = arena.busy
	actor.disabled = locked or not is_lab
	opponent.disabled = locked or not is_lab
	form.disabled = locked or not is_lab
	skill.disabled = locked or not is_lab
	play_button.disabled = locked or not is_lab
	pause_button.disabled = not is_lab
	step_button.disabled = not is_lab
	rate.disabled = not is_lab
	pause_button.text = "Continuar" if arena.paused else "Pausar"
	end_button.visible = not is_lab
	end_button.disabled = locked or model.state.turn != "player" or not model.state.winner.is_empty()
	status.text = "ANIMAÇÃO PAUSADA" if arena.paused else "REPRODUZINDO…" if locked else "LABORATÓRIO · PRONTO" if is_lab else "VITÓRIA: "+model.state[model.state.winner].name if not model.state.winner.is_empty() else ("SEU TURNO" if model.state.turn == "player" else "TURNO DA CPU")+" · %d/2 ações" % model.state.actions
	note.text = "Godot nativo: Goku e Cell. O editor de quadros, Aang e Saibaman continuam na versão anterior durante a migração." if is_lab else "Goku × Vegeta · 100 de vida · 2 ações por turno. As regras vêm da versão atual do projeto."
	for child in hand.get_children(): child.queue_free(); hand.remove_child(child)
	if is_lab and actor.selected == 1 and opponent.selected == 0: return
	var side := "player" if not is_lab or actor.selected == 0 else "enemy"
	var keys: Array = model.cards.keys() if is_lab else model.state.player.hand
	for i in range(keys.size()):
		var key: String = keys[i]
		var c: Dictionary = model.cards[key]
		var card := Button.new()
		card.custom_minimum_size = Vector2(175,200)
		card.disabled = locked or (not is_lab and not model.can_play("player",i))
		card.tooltip_text = c.description
		var content := VBoxContainer.new()
		content.mouse_filter = Control.MOUSE_FILTER_IGNORE
		content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		content.offset_left = 10
		content.offset_right = -10
		content.offset_top = 8
		content.offset_bottom = -8
		card.add_child(content)
		var actions: int = c.get("actions",1)
		var costs := label("%d KI · %d %s" % [c.cost,actions,"AÇÃO" if actions == 1 else "AÇÕES"],content,13)
		costs.modulate = Color("ffc467")
		var picture := TextureRect.new()
		picture.custom_minimum_size = Vector2(130,72)
		picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var texture := AtlasTexture.new()
		texture.atlas = Arena.GOKU_TEXTURE
		var art: String = {"superBeam":"beamFx","transform":"ssjIdle"}.get(key,key)
		var frames: Array = arena.goku.get(art,arena.goku.idle)
		var r: Array = frames.back().rect
		texture.region = Rect2(r[0],r[1],r[2],r[3])
		picture.texture = texture
		content.add_child(picture)
		var name_label := label(c.name,content,16)
		name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label("%d DANO" % c.damage if c.has("damage") else "SUPORTE",content,13)
		if is_lab:
			card.pressed.connect(func():
				for j in range(skill.item_count):
					if skill.get_item_metadata(j) == key: skill.select(j)
				play_selected())
		else: card.pressed.connect(start_card.bind("player",i))
		hand.add_child(card)
	arena.queue_redraw()

func _process(delta: float) -> void:
	if not is_lab and not arena.busy and model.state.turn == "enemy" and model.state.winner.is_empty():
		cpu_wait -= delta
		if cpu_wait <= 0:
			var choice: int = model.choose_enemy()
			if choice >= 0: start_card("enemy",choice)
			else: model.end_turn(); refresh()
	if test_bridge:
		bridge_timer += delta
		if bridge_timer >= 0.05:
			bridge_timer = 0
			web_test_bridge()

# Opt-in automation bridge. The game and its rules run in GDScript, not JavaScript.
func web_test_bridge() -> void:
	var command = JavaScriptBridge.eval("window.godotCommand || ''")
	if command is String and not command.is_empty():
		JavaScriptBridge.eval("window.godotCommand = ''")
		if command == "reset": reset_session()
		elif command == "pause": arena.paused = not arena.paused; refresh()
		elif command == "step": arena.step_frame(); refresh()
		elif command == "game": is_lab = false; mode.select(1); reset_session()
		elif command == "end": end_player_turn()
		elif command.begins_with("lab:"):
			is_lab = true
			mode.select(0)
			actor.select(0)
			reset_session()
			for i in range(skill.item_count):
				if skill.get_item_metadata(i) == command.substr(4): skill.select(i); play_selected(); break
		elif command.begins_with("cell:"):
			is_lab = true
			mode.select(0)
			actor.select(1)
			opponent.select(0)
			reset_session()
			for i in range(skill.item_count):
				if skill.get_item_metadata(i) == command.substr(5): skill.select(i); play_selected(); break
	var snapshot := {"engine":"Godot", "state":model.state,"busy":arena.busy,"paused":arena.paused,"time":arena.time,"effects":arena.effects.size(),"impacts":arena.impacts,"target_impacts":arena.target_impacts,"key":arena.active_key,"pending":model.pending,"lab":is_lab,"skill_count":skill.item_count}
	JavaScriptBridge.eval("window.godotState = "+JSON.stringify(snapshot))
