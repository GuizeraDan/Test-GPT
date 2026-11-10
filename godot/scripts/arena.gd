class_name DuelArena
extends Control

signal hit(side: String)
signal completed
const GOKU_TEXTURE = preload("res://assets/goku-atlas.png")
const CELL_TEXTURE = preload("res://assets/cell-atlas.png")
const TEMPLE = preload("res://assets/temple.png")
var goku: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/goku.json"))
var cell: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/cell.json"))
var model: BattleModel
var enemy_character := "cell"
var player_form := "base"
var enemy_form := "base"
var busy := false
var paused := false
var speed := 1.0
var time := 0.0
var end_time := 0.0
var events: Array = []
var effects: Array = []
var poses: Dictionary = {}
var hurt_until := {"player":0.0,"enemy":0.0}
var contact_side := ""
var jump_side := ""
var move_side := ""
var active_side := "player"
var active_key := ""
var impacts := 0
var target_impacts := 0
var last_damage := ""

func _ready() -> void:
	custom_minimum_size = Vector2(800,400)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func frames_for(side: String, clip: String) -> Array:
	if side == "player" and player_form == "gogetaSSJ" and clip != "gogeta": return goku.gogetaIdle
	if side == "player" and player_form == "ssj" and clip == "hurt": return goku.ssjIdle
	if side == "enemy" and enemy_character == "cell": return cell.get(clip,cell.idle).frames
	if side == "enemy":
		var index := 1 if clip in ["strike","hurt"] else 2 if clip in ["beam","blast","superBeam","charge","kienzan"] else 0
		return [goku.vegeta[index]]
	return goku.get(clip,goku.idle)

func idle_key(side: String) -> String:
	var form := player_form if side == "player" else enemy_form
	return "gogetaIdle" if form == "gogetaSSJ" and side == "player" else "ssjIdle" if form == "ssj" and side == "player" else "idle"

func duration(frames: Array) -> float:
	var result := 0.0
	for f in frames: result += float(f.duration)
	return result

func frame_at(frames: Array, elapsed: float, loop: bool = false) -> Dictionary:
	if frames.is_empty(): return {}
	var total := duration(frames)
	var cursor := fmod(maxf(0,elapsed),total) if loop else minf(maxf(0,elapsed),total-0.0001)
	for f in frames:
		if cursor < f.duration: return f
		cursor -= f.duration
	return frames.back()

func reset_visuals() -> void:
	busy = false
	paused = false
	time = 0
	events.clear()
	effects.clear()
	poses.clear()
	hurt_until = {"player":0.0,"enemy":0.0}
	contact_side = ""
	jump_side = ""
	move_side = ""
	impacts = 0
	target_impacts = 0
	last_damage = ""
	queue_redraw()

func event(at: float, kind: String, data: Dictionary = {}) -> void:
	var e := data.duplicate()
	e.at = at
	e.kind = kind
	events.append(e)

func pose(at: float, clip: String, side: String, frames: Array = []) -> void:
	if side == "player" and player_form == "gogetaSSJ" and clip != "gogeta": frames = goku.gogetaIdle
	event(at,"pose",{"side":side,"frames":frames_for(side,clip) if frames.is_empty() else frames})

func effect(at: float, clip: String, side: String, life: float, kind: String = "shot", dimensions: Vector2 = Vector2(95,45), atlas: String = "goku") -> void:
	event(at,"effect",{"clip":clip,"side":side,"life":life,"effect_kind":kind,"dimensions":dimensions,"atlas":atlas})

func impact(at: float, side: String, damage: bool = true, art: String = "impact", atlas: String = "goku") -> void:
	event(at,"impact",{"side":side,"damage":damage,"art":art,"atlas":atlas})

func play_goku(side: String, key: String) -> void:
	reset_visuals()
	busy = true
	active_side = side
	active_key = key
	var form := player_form if side == "player" else enemy_form
	var ssj := form != "base"
	match key:
		"idle":
			pose(0,idle_key(side),side)
			end_time = 2
		"strike":
			contact_side = side
			pose(0,idle_key(side),side)
			pose(0.24,"ssjStrike" if ssj else "strike",side)
			end_time = 2.4
			for at in [0.40,0.56,0.72,0.96,1.28,1.52,1.68]: impact(at,side,false,"contact")
			impact(1.84,side,true,"contact")
		"blast":
			pose(0,"ssjFire" if ssj else "blast",side,goku.blast.slice(0,2) if side == "player" and not ssj else [])
			for i in range(4):
				var start := 0.3+i*0.55
				var offset := 2 if i%2 == 0 else 4
				pose(start,"ssjFire" if ssj else "blast",side,[] if ssj or side == "enemy" else goku.blast.slice(offset,offset+2))
				effect(start+0.1,"projectile",side,0.32)
				impact(start+0.42,side)
			end_time = 2.65
		"beam":
			pose(0,"ssjFire" if ssj else "beam",side)
			effect(0.7,"beamFx",side,0.75,"beam",Vector2(1,80))
			impact(0.95,side)
			end_time = 1.7
		"superBeam":
			pose(0,"kamePrepare",side)
			pose(1.5,"kameFire",side)
			effect(2.1,"beamFx",side,0.95,"beam",Vector2(1,150))
			impact(2.35,side,true,"superImpact")
			pose(3.1,"kameRecover",side)
			end_time = 3.7
		"kienzan":
			for i in range(3):
				var start := i*1.1
				pose(start,"ssjFire" if ssj else "kienzan",side)
				effect(start+0.6,"disc",side,0.38,"shot",Vector2(115,115))
				impact(start+0.98,side,i == 2)
			end_time = 3.5
		"charge":
			pose(0,"ssjCharge" if ssj else "charge",side)
			end_time = 1.1
		"transform":
			pose(0,"transform",side)
			end_time = 1.5
		"gogeta":
			pose(0,"gogeta",side)
			end_time = duration(goku.gogeta)
		"evade":
			pose(0,"evade",side)
			move_side = side
			end_time = 0.8
		_:
			pose(0,idle_key(side),side)
			end_time = 0.8
	events.sort_custom(func(a,b): return a.at < b.at)
	advance(0)

func play_cell(key: String) -> void:
	reset_visuals()
	busy = true
	active_side = "enemy"
	active_key = key
	var c: Dictionary = cell[key]
	pose(0,key,"enemy")
	end_time = duration(c.frames)
	if c.get("contact",false):
		contact_side = "enemy"
		end_time += 0.4
		var at := 0.2
		for i in range(c.frames.size()):
			if i%2 == 1: impact(at,"enemy",false,"contact")
			at += c.frames[i].duration
	if c.get("move",false): move_side = "enemy"
	if c.get("jump",false): jump_side = "enemy"
	if c.has("shot"):
		var at := 0.0
		for i in range(int(c.release)): at += c.frames[i].duration
		var is_beam: bool = c.get("beam",false)
		effect(at,c.shot,"enemy",0.5 if is_beam else 0.3,"beam" if is_beam else "shot",Vector2(100,18 if key == "makankosappo" else 60 if is_beam else 25),"cell")
		if key == "kienzan": effect(at+0.12,"115","enemy",0.3,"shot",Vector2(100,25),"cell")
		impact(at+0.3,"enemy",false,"explosionFx" if c.get("impact",false) else "impact","cell" if c.get("impact",false) else "goku")
		end_time = maxf(end_time,at+1.1)
	if c.get("ground",false):
		effect(0.35,"121","enemy",0.5,"target",Vector2(150,140),"cell")
		impact(0.5,"enemy",false)
	end_time += 0.15
	events.sort_custom(func(a,b): return a.at < b.at)
	advance(0)

func _process(delta: float) -> void:
	if not paused: advance(delta*speed)

func step_frame() -> void:
	paused = true
	advance(1.0/60)

func advance(delta: float) -> void:
	time += delta
	while not events.is_empty() and events[0].at <= time:
		var e: Dictionary = events.pop_front()
		match e.kind:
			"pose": poses[e.side] = {"frames":e.frames,"start":e.at}
			"effect":
				var from := anchor(e.side)+Vector2(55 if e.side == "player" else -55,-85)
				var target_side := "enemy" if e.side == "player" else "player"
				var to := anchor(target_side)+Vector2(0,-85)
				effects.append({"frames":cell[e.clip].frames if e.atlas == "cell" else goku[e.clip],"start":e.at,"life":e.life,"from":to if e.effect_kind == "target" else from,"to":to,"kind":e.effect_kind,"dimensions":e.dimensions,"atlas":e.atlas,"mirror":e.side == "enemy"})
			"impact":
				var target_side := "enemy" if e.side == "player" else "player"
				hurt_until[target_side] = e.at+0.25
				target_impacts += 1
				var to := anchor(target_side)+Vector2(0,-85)
				var life := 0.25
				var frames: Array = []
				if e.art != "contact":
					frames = cell[e.art].frames if e.atlas == "cell" else goku[e.art]
					life = duration(frames) if e.art in ["superImpact","explosionFx"] else 0.25
				effects.append({"frames":frames,"start":e.at,"life":life,"from":to,"to":to,"kind":"contact" if e.art == "contact" else "target","dimensions":Vector2(290,290) if e.art == "superImpact" else Vector2(170,170) if e.art == "explosionFx" else Vector2(75,75),"atlas":e.atlas,"mirror":false})
				if e.damage:
					impacts += 1
					hit.emit(e.side)
	effects = effects.filter(func(e): return time-e.start < e.life)
	if busy and time >= end_time and effects.is_empty():
		busy = false
		poses.clear()
		contact_side = ""
		move_side = ""
		jump_side = ""
		completed.emit()
	queue_redraw()

func anchor(side: String) -> Vector2:
	var home := Vector2(290,390) if side == "player" else Vector2(990,390)
	var direction := 1 if side == "player" else -1
	if contact_side == side:
		var progress := minf(1,time/0.22) * minf(1,maxf(0,(end_time-time)/0.22))
		home.x += direction*610*progress
	if move_side == side: home.x += direction*80*sin(PI*clampf(time/end_time,0,1))
	if jump_side == side: home.y -= 85*sin(PI*clampf(time/end_time,0,1))
	return home

func draw_frame(f: Dictionary, point: Vector2, atlas: String, mirror: bool, dimensions: Vector2 = Vector2.ZERO) -> void:
	var texture := CELL_TEXTURE if atlas == "cell" else GOKU_TEXTURE
	var r: Array = f.rect
	var source := Rect2(r[0],r[1],r[2],r[3])
	var viewport_scale := Vector2(size.x/1280.0,size.y/440.0)
	draw_set_transform(point*viewport_scale,0,viewport_scale*Vector2(-1 if mirror else 1,1))
	var destination: Rect2
	if dimensions != Vector2.ZERO:
		destination = Rect2(-dimensions/2,dimensions)
	else:
		var z: float = f.get("scale",1)
		destination = Rect2(-Vector2(f.pivot[0],f.pivot[1])*z,source.size*z)
	draw_texture_rect_region(texture,destination,source)
	draw_set_transform(Vector2.ZERO,0,viewport_scale)

func draw_beam(f: Dictionary, point: Vector2, atlas: String, mirror: bool, dimensions: Vector2) -> void:
	# Preserve the blast's two ends; extend only the middle as the beam travels.
	var texture := CELL_TEXTURE if atlas == "cell" else GOKU_TEXTURE
	var r: Array = f.rect
	var source := Rect2(r[0],r[1],r[2],r[3])
	var viewport_scale := Vector2(size.x/1280.0,size.y/440.0)
	draw_set_transform(point*viewport_scale,0,viewport_scale*Vector2(-1 if mirror else 1,1))
	var source_cap := source.size.x*0.25
	var cap := minf(dimensions.x/2,source_cap*dimensions.y/source.size.y)
	var left := -dimensions.x/2
	var top := -dimensions.y/2
	draw_texture_rect_region(texture,Rect2(left,top,cap,dimensions.y),Rect2(source.position,Vector2(source_cap,source.size.y)))
	if dimensions.x > cap*2:
		draw_texture_rect_region(texture,Rect2(left+cap,top,dimensions.x-cap*2,dimensions.y),Rect2(source.position+Vector2(source_cap,0),Vector2(source.size.x-source_cap*2,source.size.y)))
	draw_texture_rect_region(texture,Rect2(dimensions.x/2-cap,top,cap,dimensions.y),Rect2(source.position+Vector2(source.size.x-source_cap,0),Vector2(source_cap,source.size.y)))
	draw_set_transform(Vector2.ZERO,0,viewport_scale)

func _draw() -> void:
	var viewport_scale := Vector2(size.x/1280.0,size.y/440.0)
	draw_set_transform(Vector2.ZERO,0,viewport_scale)
	draw_texture_rect(TEMPLE,Rect2(0,0,1280,440),false)
	for side in ["player","enemy"]:
		var point := anchor(side)
		draw_shadow(point+Vector2(0,-2))
		var pose_data: Dictionary = poses.get(side,{})
		var frames: Array = pose_data.get("frames",frames_for(side,idle_key(side)))
		var elapsed: float = time-pose_data.get("start",0.0)
		if hurt_until[side] > time:
			frames = frames_for(side,"hurt")
			elapsed = 0
		var f := frame_at(frames,elapsed,pose_data.is_empty())
		draw_frame(f,point,"cell" if side == "enemy" and enemy_character == "cell" else "goku",side == "enemy")
	for e in effects:
		var elapsed: float = time-e.start
		if e.kind == "contact":
			var p: Vector2 = e.to
			for i in range(8):
				var angle := i*TAU/8
				draw_line(p+Vector2.from_angle(angle)*8,p+Vector2.from_angle(angle)*(25+elapsed*30),Color(1,0.85,0.3,1-elapsed/e.life),4)
			continue
		var dimensions: Vector2 = e.dimensions
		var point: Vector2 = e.from
		if e.kind == "beam":
			var reach := minf(1,elapsed/0.25)
			var end: Vector2 = e.from.lerp(e.to,reach)
			dimensions.x = maxf(1,absf(end.x-e.from.x))
			point = (e.from+end)/2
			draw_beam(frame_at(e.frames,elapsed),point,e.atlas,e.mirror,dimensions)
			continue
		elif e.kind == "shot": point = e.from.lerp(e.to,minf(1,elapsed/e.life))
		draw_frame(frame_at(e.frames,elapsed,e.kind == "shot"),point,e.atlas,e.mirror,dimensions)
	if model:
		draw_hud(model.state.player,Vector2(26,24))
		draw_hud(model.state.enemy,Vector2(934,24))
		var font := ThemeDB.fallback_font
		draw_string(font,Vector2(540,45),"ROUND %02d" % model.state.round,HORIZONTAL_ALIGNMENT_CENTER,200,28,Color.WHITE)
		draw_string(font,Vector2(450,78),last_damage,HORIZONTAL_ALIGNMENT_CENTER,380,20,Color(1,0.85,0.4))

func draw_shadow(point: Vector2) -> void:
	var polygon := PackedVector2Array()
	for i in range(24): polygon.append(point+Vector2(cos(i*TAU/24)*45,sin(i*TAU/24)*9))
	draw_colored_polygon(polygon,Color(0.1,0.1,0.1,0.22))

func draw_hud(f: Dictionary, point: Vector2) -> void:
	var font := ThemeDB.fallback_font
	draw_style_box(hud_box(),Rect2(point,Vector2(320,125)))
	draw_string(font,point+Vector2(16,30),f.name.to_upper(),HORIZONTAL_ALIGNMENT_LEFT,-1,22,Color.WHITE)
	draw_rect(Rect2(point+Vector2(16,48),Vector2(288,10)),Color(0.15,0.25,0.27))
	draw_rect(Rect2(point+Vector2(16,48),Vector2(288*f.hp/100,10)),Color(0.48,0.88,0.69))
	draw_string(font,point+Vector2(16,82),"VIDA %d / 100     KI %d / 8" % [f.hp,f.ki],HORIZONTAL_ALIGNMENT_LEFT,-1,17,Color(0.8,0.9,0.91))
	draw_string(font,point+Vector2(16,108),"Escudo %d · Reação %d" % [f.shield,f.reaction],HORIZONTAL_ALIGNMENT_LEFT,-1,15,Color(0.6,0.75,0.78))

func hud_box() -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(0.035,0.09,0.1,0.93)
	box.set_corner_radius_all(8)
	return box
