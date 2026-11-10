class_name BattleModel
extends RefCounted

var cards: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/cards.json"))
var state: Dictionary
var pending: Dictionary = {}
var rng := RandomNumberGenerator.new()
const DECK = ["superBeam","strike","charge","guard","blast","beam","kienzan","evade","transform","gogeta","strike","blast","guard","charge","beam","evade","strike"]

func _init(seed_value: int = 0) -> void:
	if seed_value: rng.seed = seed_value
	else: rng.randomize()
	reset()

func shuffled(items: Array) -> Array:
	var result := items.duplicate()
	for i in range(result.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var old = result[i]
		result[i] = result[j]
		result[j] = old
	return result

func fighter(display_name: String) -> Dictionary:
	return {"name":display_name,"hp":100.0,"ki":3,"shield":0.0,"reaction":0.0,"transformed":false,"form":"base","deck":shuffled(DECK),"discard":[],"hand":["strike","charge","evade","transform"]}

func reset() -> void:
	pending = {}
	state = {"player":fighter("Goku"),"enemy":fighter("Vegeta"),"turn":"player","round":1,"actions":2,"winner":"","log":[]}

func can_play(side: String, index: int) -> bool:
	if not state.winner.is_empty() or not pending.is_empty() or state.turn != side: return false
	var f: Dictionary = state[side]
	if index < 0 or index >= f.hand.size(): return false
	var c: Dictionary = cards[f.hand[index]]
	return state.actions >= c.get("actions",1) and f.ki >= c.cost and not (c.get("transform",false) and (f.form == "gogetaSSJ" if c.get("form","") == "gogetaSSJ" else f.transformed)) and not (c.has("reaction") and f.reaction > 0)

func begin_card(side: String, index: int) -> bool:
	if not can_play(side,index): return false
	var f: Dictionary = state[side]
	var key: String = f.hand[index]
	var c: Dictionary = cards[key]
	f.hand.remove_at(index)
	f.discard.append(key)
	f.ki -= c.cost
	state.actions -= c.get("actions",1)
	var hits: int = 4 if key == "blast" else 1 if c.has("damage") else 0
	pending = {"side":side,"key":key,"hits":hits,"resolved":0,"damage":(c.get("damage",0)+(8 if f.transformed and c.has("damage") else 0))/float(maxi(1,hits))}
	return true

func impact() -> Dictionary:
	if pending.is_empty() or pending.resolved >= pending.hits: return {}
	var target: Dictionary = state["enemy" if pending.side == "player" else "player"]
	var damage: float = pending.damage
	var reaction: float = minf(damage,target.reaction)
	damage -= reaction
	target.reaction = 0
	var shield: float = minf(damage,target.shield)
	damage -= shield
	target.shield -= shield
	var before: float = target.hp
	target.hp = maxf(0,target.hp-damage)
	pending.resolved += 1
	return {"damage":before-target.hp,"blocked":reaction+shield,"hit":pending.resolved,"hp":target.hp}

func finish_card() -> bool:
	if pending.is_empty() or pending.resolved != pending.hits: return false
	var f: Dictionary = state[pending.side]
	var target: Dictionary = state["enemy" if pending.side == "player" else "player"]
	var c: Dictionary = cards[pending.key]
	if c.has("ki"): f.ki = mini(8,f.ki+int(c.ki))
	if c.has("shield"): f.shield += c.shield
	if c.has("reaction"): f.reaction = c.reaction
	if c.get("transform",false):
		f.transformed = true
		f.form = c.get("form","ssj")
	if target.hp <= 0: state.winner = pending.side
	state.log.append(f.name+": "+c.name)
	if state.log.size() > 40: state.log.pop_front()
	pending = {}
	return true

func play(side: String, index: int) -> bool:
	if not begin_card(side,index): return false
	while pending.resolved < pending.hits: impact()
	return finish_card()

func end_turn() -> bool:
	if not pending.is_empty() or not state.winner.is_empty(): return false
	state.turn = "enemy" if state.turn == "player" else "player"
	if state.turn == "player": state.round += 1
	var f: Dictionary = state[state.turn]
	f.shield = 0
	f.ki = mini(8,f.ki+2) - (1 if f.transformed else 0)
	for i in range(2):
		if f.hand.size() >= 7: break
		if f.deck.is_empty():
			f.deck = shuffled(f.discard)
			f.discard = []
		if not f.deck.is_empty(): f.hand.append(f.deck.pop_back())
	state.actions = 2
	return true

func choose_enemy() -> int:
	var best := -1
	var score := -INF
	for i in range(state.enemy.hand.size()):
		if not can_play("enemy",i): continue
		var c: Dictionary = cards[state.enemy.hand[i]]
		var value: float = c.get("damage",0)+(8 if state.enemy.transformed else 0) if c.has("damage") else (24 if state.enemy.ki < 4 else 2) if c.has("ki") else 26 if c.get("transform",false) else (23 if state.enemy.hp < 45 else 10) if c.has("shield") else 12
		if value > score:
			score = value
			best = i
	return best
