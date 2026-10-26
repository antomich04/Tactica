from models.Moment import Moment, MomentCategory
from models.Overlays import Overlay, OverlayType, PersonaType


FAST_OVERLAY_COPY = {
    "goal": {
        "en": "GOAL! {scorer} scores for {team}!",
        "es": "¡GOL! {scorer} marca para {team}!",
        "pt": "GOLO! {scorer} marca para {team}!",
        "gr": "ΓΚΟΛ! Ο/Η {scorer} σκοράρει για την {team}!",
    },
    "red_card": {
        "en": "RED CARD! {player} ({team}) is sent off!",
        "es": "¡TARJETA ROJA! {player} ({team}) es expulsado.",
        "pt": "CARTÃO VERMELHO! {player} ({team}) é expulso.",
        "gr": "ΚΟΚΚΙΝΗ ΚΑΡΤΑ! Ο/Η {player} ({team}) αποβάλλεται!",
    },
    "penalty": {
        "en": "PENALTY AWARDED to {team}!",
        "es": "¡PENALTI para {team}!",
        "pt": "PÊNALTI para {team}!",
        "gr": "ΠΕΝΑΛΤΙ για την {team}!",
    },
    "momentum": {
        "en": "Tactical swing: Game chaos reached {chaos:.0f}%. High turnover rate.",
        "es": "Cambio táctico: el caos del partido alcanzó el {chaos:.0f}%. Muchas pérdidas de balón.",
        "pt": "Mudança tática: o caos do jogo chegou a {chaos:.0f}%. Muitas perdas de bola.",
        "gr": "Τακτική αλλαγή: το χάος του αγώνα έφτασε το {chaos:.0f}%. Πολλές απώλειες κατοχής.",
    },
    "key_action": {
        "en": "Key action: {category} by {player}.",
        "es": "Acción clave: {category} de {player}.",
        "pt": "Lance importante: {category} de {player}.",
        "gr": "Σημαντική φάση: {category} από τον/την {player}.",
    },
    "penalty_save": {
        "en": "PENALTY SAVED! {player} denies the spot-kick for {team}!",
        "es": "¡PENALTI detenido! {player} evita el gol para {team}.",
        "pt": "PÊNALTI defendido! {player} evita o gol para {team}!",
        "gr": "ΑΠΟΚΡΟΥΣΗ ΠΕΝΑΛΤΙ! Ο/Η {player} κρατά το μηδέν για την {team}!",
    },
    "yellow_card": {
        "en": "YELLOW CARD: {player} ({team}) is booked for a {reason}.",
        "es": "TARJETA AMARILLA: {player} ({team}) es amonestado por {reason}.",
        "pt": "CARTÃO AMARELO: {player} ({team}) é advertido por {reason}.",
        "gr": "ΚΙΤΡΙΝΗ ΚΑΡΤΑ: Ο/Η {player} ({team}) τιμωρείται για {reason}.",
    },
    "substitution": {
        "en": "SUBSTITUTION ({team}): {player_on} replaces {player_off}.",
        "es": "CAMBIO ({team}): {player_on} sustituye a {player_off}.",
        "pt": "SUBSTITUIÇÃO ({team}): {player_on} entra no lugar de {player_off}.",
        "gr": "ΑΛΛΑΓΗ ({team}): Ο/Η {player_on} παίρνει τη θέση του/της {player_off}.",
    },
    "tactical_control": {
        "en": "TACTICAL CONTROL: {team} dictating the tempo with a {control:.1f}% Control Index (Chaos: {chaos:.1f}%).",
        "es": "CONTROL TÁCTICO: {team} marca el ritmo con un índice de control del {control:.1f}% (caos: {chaos:.1f}%).",
        "pt": "CONTROLE TÁTICO: {team} dita o ritmo com um índice de controle de {control:.1f}% (caos: {chaos:.1f}%).",
        "gr": "ΤΑΚΤΙΚΟΣ ΕΛΕΓΧΟΣ: Η {team} ορίζει τον ρυθμό με δείκτη ελέγχου {control:.1f}% (χάος: {chaos:.1f}%).",
    },
    "half_time": {
        "en": "HALF TIME (45:00): The referee blows for the interval. Press Resume to kick off the 2nd half.",
        "es": "DESCANSO (45:00): El árbitro señala el final de la primera parte. Pulsa Reanudar para comenzar la segunda.",
        "pt": "INTERVALO (45:00): O árbitro apita para o descanso. Selecione Retomar para iniciar a segunda parte.",
        "gr": "ΗΜΙΧΡΟΝΟ (45:00): Ο διαιτητής σφυρίζει τη λήξη του πρώτου ημιχρόνου. Πατήστε Συνέχεια για να αρχίσει το δεύτερο.",
    },
}

_CARD_REASONS = {
    "en": {
        "tactical foul": "tactical foul",
        "second yellow": "second yellow card",
    },
    "es": {
        "tactical foul": "falta táctica",
        "second yellow": "segunda tarjeta amarilla",
    },
    "pt": {
        "tactical foul": "falta tática",
        "second yellow": "segundo cartão amarelo",
    },
    "gr": {
        "tactical foul": "τακτικό φάουλ",
        "second yellow": "δεύτερη κίτρινη κάρτα",
    },
}

_SUBSTITUTION_FALLBACK = {
    "en": "a teammate",
    "es": "un compañero",
    "pt": "um colega",
    "gr": "ένας συμπαίκτης",
}

_CATEGORY_NAMES = {
    "en": {
        "goal": "goal",
        "red_card": "red card",
        "penalty": "penalty",
        "high_xg_save": "high-xG save",
        "dangerous_free_kick": "dangerous free kick",
        "momentum_spike": "momentum swing",
        "substitution": "substitution",
    },
    "es": {
        "goal": "gol",
        "red_card": "tarjeta roja",
        "penalty": "penalti",
        "high_xg_save": "parada ante un xG alto",
        "dangerous_free_kick": "tiro libre peligroso",
        "momentum_spike": "cambio de ritmo",
        "substitution": "cambio",
    },
    "pt": {
        "goal": "gol",
        "red_card": "cartão vermelho",
        "penalty": "pênalti",
        "high_xg_save": "defesa diante de um xG alto",
        "dangerous_free_kick": "cobrança de falta perigosa",
        "momentum_spike": "mudança de ritmo",
        "substitution": "substituição",
    },
    "gr": {
        "goal": "γκολ",
        "red_card": "κόκκινη κάρτα",
        "penalty": "πέναλτι",
        "high_xg_save": "απόκρουση σε ευκαιρία υψηλού xG",
        "dangerous_free_kick": "επικίνδυνο φάουλ",
        "momentum_spike": "αλλαγή ρυθμού",
        "substitution": "αλλαγή",
    },
}


def fast_overlay_text(template: str, language: str, **values: object) -> str:
    copy = FAST_OVERLAY_COPY[template].get(language, FAST_OVERLAY_COPY[template]["en"])
    if template == "key_action":
        category = str(values["category"])
        values["category"] = _CATEGORY_NAMES.get(language, _CATEGORY_NAMES["en"]).get(
            category, category.replace("_", " ").title()
        )
    elif template == "yellow_card":
        reason = str(values["reason"]).casefold()
        values["reason"] = _CARD_REASONS.get(language, _CARD_REASONS["en"]).get(
            reason, values["reason"]
        )
    elif template == "substitution" and values["player_off"] == "a teammate":
        values["player_off"] = _SUBSTITUTION_FALLBACK.get(
            language, _SUBSTITUTION_FALLBACK["en"]
        )
    return copy.format(**values)


def fast_overlay_translations(
    template: str, **values: object
) -> dict[str, str]:
    return {
        language: fast_overlay_text(template, language, **values)
        for language in ("en", "es", "pt", "gr")
    }


def moment_to_fast_overlay(moment: Moment, language: str = "en") -> Overlay:
    ev = moment.primary_event
    template: str
    values: dict[str, object]

    if moment.category == MomentCategory.GOAL:
        template = "goal"
        scorer = getattr(ev, "scorer", ev.player)
        values = {"scorer": scorer, "team": ev.team}
        overlay_type = OverlayType.GOAL
        duration, priority, persona = 6.0, 1, PersonaType.CASUAL
        meta = {"team": ev.team, "player": scorer}
    elif moment.category == MomentCategory.RED_CARD:
        template = "red_card"
        values = {"player": ev.player, "team": ev.team}
        overlay_type = OverlayType.CARD
        duration, priority, persona = 6.0, 1, PersonaType.CASUAL
        meta = {"team": ev.team, "player": ev.player}
    elif moment.category == MomentCategory.PENALTY:
        template = "penalty"
        values = {"team": ev.team}
        overlay_type = OverlayType.MILESTONE
        duration, priority, persona = 5.0, 2, PersonaType.CASUAL
        meta = {"team": ev.team}
    elif moment.category == MomentCategory.MOMENTUM_SPIKE:
        template = "momentum"
        chaos = moment.stats_context.get("chaos_index", 0.0)
        values = {"chaos": chaos}
        overlay_type = OverlayType.MOMENTUM_SHIFT
        duration, priority, persona = 5.0, 3, PersonaType.ANALYST
        meta = moment.stats_context
    else:
        template = "key_action"
        values = {"category": moment.category.value, "player": ev.player}
        overlay_type = OverlayType.MOMENTUM_SHIFT
        duration, priority, persona = 4.0, 4, PersonaType.CASUAL
        meta = {"x": ev.x, "y": ev.y}

    return Overlay(
        id=f"ov_{moment.id}",
        match_id=moment.match_id,
        timestamp=moment.timestamp,
        duration=duration,
        type=overlay_type,
        priority=priority,
        language=language if language in FAST_OVERLAY_COPY["goal"] else "en",
        persona=persona,
        text=fast_overlay_text(template, language, **values),
        evidence_event_ids=moment.evidence_event_ids,
        verified=True,
        meta=meta,
    )
