#!/usr/bin/env bash
# Vérification des politiques RLS.
#
# À relancer après CHAQUE migration touchant aux politiques ou aux droits.
#
# PIÈGE PRINCIPAL : sous RLS, une lecture interdite ne renvoie PAS 403 mais
# « 200 [] ». Une écriture interdite renvoie « 204 » sans rien modifier.
# « Pas d'erreur donc c'est sécurisé » est exactement l'inverse de la vérité.
# C'est aussi pourquoi la base doit contenir des données de démonstration :
# sur une base vide, « refusé » et « vide » sont indiscernables.
#
# Utiliser IMPÉRATIVEMENT la clé publiable (sb_publishable_…) : la clé secrète
# contourne RLS et ne prouverait rien.
#
# Les corps de requête accentués passent par un fichier temporaire et
# `--data-binary @fichier`. Sous Git Bash (Windows), les arguments non-ASCII
# passés en ligne de commande sont ré-encodés et arrivent en JSON invalide.
#
# Usage :
#   bash scripts/verifier-rls.sh                        # pile locale
#   SB_URL=... SB_ANON=... bash scripts/verifier-rls.sh  # projet hébergé

set -uo pipefail

SB_URL="${SB_URL:-http://127.0.0.1:54321}"
SB_ANON="${SB_ANON:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@viacesi.fr}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-MotDePasseTest123!}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

ok=0
ko=0

reussite() { printf '  \033[32mOK\033[0m    %s\n' "$1"; ok=$((ok + 1)); }
echec()    { printf '  \033[31mÉCHEC\033[0m %s\n' "$1"; ko=$((ko + 1)); }
titre()    { printf '\n\033[1m%s\033[0m\n' "$1"; }

anon_get() {
  curl -s "$SB_URL/rest/v1/$1" -H "apikey: $SB_ANON" -H "Authorization: Bearer $SB_ANON"
}

# post_json <chemin_rest> <jeton> <fichier_corps> [entêtes supplémentaires...]
post_json() {
  local chemin="$1" jeton="$2" fichier="$3"; shift 3
  curl -s -X POST "$SB_URL/rest/v1/$chemin" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
    -H "Content-Type: application/json" "$@" --data-binary "@$fichier"
}

titre "1. Un visiteur anonyme ne doit lire AUCUNE donnée sensible"

for table in tickets ticket_categories utilisateurs email_log configuration; do
  corps="$(anon_get "$table?select=*")"
  if [ "$corps" = "[]" ] || echo "$corps" | grep -q '"code"'; then
    reussite "anon ne lit pas $table"
  else
    echec "anon LIT $table — FUITE DE DONNÉES : ${corps:0:120}"
  fi
done

titre "2. Un visiteur anonyme doit lire les référentiels (formulaire public)"

for entree in "salles:nom" "categories_incident:label"; do
  table="${entree%%:*}"
  colonne="${entree##*:}"
  corps="$(anon_get "$table?select=$colonne&limit=3")"
  if [ "$corps" != "[]" ] && ! echo "$corps" | grep -q '"code"'; then
    reussite "anon lit $table"
  else
    echec "anon ne lit PAS $table — le formulaire public est cassé : ${corps:0:120}"
  fi
done

titre "3. Un visiteur anonyme ne doit ni modifier ni insérer de ticket"

# `Prefer: return=representation` est OBLIGATOIRE : sans lui, un refus silencieux
# renvoie 204 et ressemble à un succès.
cat > "$tmp/patch.json" <<'JSON'
{"statut":"TERMINE"}
JSON
corps="$(curl -s -X PATCH "$SB_URL/rest/v1/tickets?id=eq.1" \
  -H "apikey: $SB_ANON" -H "Authorization: Bearer $SB_ANON" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  --data-binary "@$tmp/patch.json")"
if [ "$corps" = "[]" ] || echo "$corps" | grep -q '"code"'; then
  reussite "anon ne modifie pas un ticket"
else
  echec "anon A MODIFIÉ un ticket : ${corps:0:120}"
fi

cat > "$tmp/insert.json" <<'JSON'
{"demandeur_nom":"Pirate","demandeur_email":"p@x.fr","salle_id":1,"titre":"Insertion directe"}
JSON
corps="$(post_json "tickets" "$SB_ANON" "$tmp/insert.json" -H "Prefer: return=representation")"
if echo "$corps" | grep -q '"code"'; then
  reussite "anon ne peut pas insérer directement dans tickets"
else
  echec "anon A INSÉRÉ directement dans tickets : ${corps:0:120}"
fi

titre "4. Un visiteur anonyme DOIT pouvoir déclarer un incident (parcours QR code)"

cat > "$tmp/creer.json" <<'JSON'
{"payload":{"nom":"Test Recette","email":"recette@viacesi.fr","salle":"B204",
"titre":"Test RLS automatisé","description":"Créé par verifier-rls.sh — vérifie aussi les accents.",
"risque":false,"types":["Mobilier","Propreté"]}}
JSON
corps="$(post_json "rpc/creer_ticket" "$SB_ANON" "$tmp/creer.json")"
if echo "$corps" | grep -qE '^[0-9]+$'; then
  reussite "anon crée un ticket via creer_ticket() (n° $corps)"
  # Le contenu accentué doit être stocké intact, pas échappé ni tronqué.
  verif="$(curl -s "$SB_URL/rest/v1/tickets?id=eq.$corps&select=description" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $SB_ANON")"
  if echo "$verif" | grep -q '"code"'; then
    reussite "le ticket créé reste illisible par anon"
  else
    echec "anon relit le ticket qu'il vient de créer : ${verif:0:120}"
  fi
else
  echec "anon NE PEUT PAS déclarer un incident : ${corps:0:160}"
fi

cat > "$tmp/email-invalide.json" <<'JSON'
{"payload":{"nom":"Test","email":"pas-un-email","salle":"B204","titre":"Validation"}}
JSON
corps="$(post_json "rpc/creer_ticket" "$SB_ANON" "$tmp/email-invalide.json")"
if echo "$corps" | grep -q '"code"'; then
  reussite "creer_ticket() rejette une adresse e-mail invalide"
else
  echec "creer_ticket() a accepté un e-mail invalide : ${corps:0:120}"
fi

cat > "$tmp/salle-inconnue.json" <<'JSON'
{"payload":{"nom":"Test","email":"t@viacesi.fr","salle":"Salle Inexistante","titre":"Validation"}}
JSON
corps="$(post_json "rpc/creer_ticket" "$SB_ANON" "$tmp/salle-inconnue.json")"
if echo "$corps" | grep -q '"code"'; then
  reussite "creer_ticket() rejette une salle inconnue"
else
  echec "creer_ticket() a accepté une salle inconnue : ${corps:0:120}"
fi

cat > "$tmp/type-inconnu.json" <<'JSON'
{"payload":{"nom":"Test","email":"t@viacesi.fr","salle":"B204","titre":"Validation","types":["Catégorie Inventée"]}}
JSON
corps="$(post_json "rpc/creer_ticket" "$SB_ANON" "$tmp/type-inconnu.json")"
if echo "$corps" | grep -q '"code"'; then
  reussite "creer_ticket() rejette un type d'incident inconnu"
else
  echec "creer_ticket() a accepté un type inconnu : ${corps:0:120}"
fi

titre "5. Un membre du personnel connecté doit avoir accès aux tickets"

cat > "$tmp/login.json" <<JSON
{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}
JSON
jeton="$(curl -s -X POST "$SB_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  --data-binary "@$tmp/login.json" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"

if [ -z "$jeton" ]; then
  echec "connexion impossible avec $ADMIN_EMAIL — créez le compte (docs/01-installation.md)"
else
  reussite "connexion réussie avec $ADMIN_EMAIL"

  nb="$(curl -s "$SB_URL/rest/v1/tickets?select=id" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" | grep -o '"id"' | wc -l | tr -d ' ')"
  if [ "$nb" -gt 0 ]; then
    reussite "l'administrateur lit les tickets ($nb lignes)"
  else
    echec "l'administrateur ne lit AUCUN ticket — politique trop restrictive"
  fi

  cat > "$tmp/commentaire.json" <<'JSON'
{"commentaire_admin":"Modifié par la recette — accents vérifiés."}
JSON
  corps="$(curl -s -X PATCH "$SB_URL/rest/v1/tickets?id=eq.1" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    --data-binary "@$tmp/commentaire.json")"
  if echo "$corps" | grep -q 'accents'; then
    reussite "l'administrateur modifie un commentaire (accents préservés)"
  else
    echec "l'administrateur ne peut pas modifier un ticket : ${corps:0:120}"
  fi

  # Les colonnes non modifiables sont protégées par un GRANT au niveau colonne :
  # RLS ne sait pas restreindre les colonnes.
  cat > "$tmp/colonne-interdite.json" <<'JSON'
{"demandeur_nom":"Nom reecrit"}
JSON
  corps="$(curl -s -X PATCH "$SB_URL/rest/v1/tickets?id=eq.1" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    --data-binary "@$tmp/colonne-interdite.json")"
  if echo "$corps" | grep -q '"code"'; then
    reussite "les colonnes non modifiables sont refusées (demandeur_nom)"
  else
    echec "un technicien a pu réécrire demandeur_nom : ${corps:0:120}"
  fi

  nb="$(curl -s "$SB_URL/rest/v1/utilisateurs?select=id" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" | grep -o '"id"' | wc -l | tr -d ' ')"
  if [ "$nb" -gt 0 ]; then
    reussite "l'administrateur lit l'annuaire du personnel ($nb compte(s))"
  else
    echec "l'administrateur ne lit pas l'annuaire — la liste des traitants sera vide"
  fi

  # ---------------------------------------------------------------------------
  # Écran « Utilisateurs » : l'administration des comptes passe désormais par
  # l'API REST. Ce qu'elle NE doit PAS permettre compte autant que ce qu'elle
  # permet — ces trois contrôles gardent la porte.
  # ---------------------------------------------------------------------------
  moi="$(curl -s "$SB_URL/rest/v1/utilisateurs?select=id&email=eq.$ADMIN_EMAIL" \
    -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
    | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"

  if [ -z "$moi" ]; then
    echec "aucune ligne utilisateurs pour $ADMIN_EMAIL — contrôles de gestion des comptes ignorés"
  else
    # `email` reflète auth.users.email : le réécrire ici désynchroniserait
    # l'annuaire de l'identité de connexion. Protégé par un GRANT de colonne.
    cat > "$tmp/email-reecrit.json" <<'JSON'
{"email":"pirate@viacesi.fr"}
JSON
    corps="$(curl -s -X PATCH "$SB_URL/rest/v1/utilisateurs?id=eq.$moi" \
      -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
      -H "Content-Type: application/json" -H "Prefer: return=representation" \
      --data-binary "@$tmp/email-reecrit.json")"
    if echo "$corps" | grep -q '"code"'; then
      reussite "l'e-mail d'un compte n'est pas réinscriptible (identifiant de connexion)"
    else
      echec "un administrateur a RÉÉCRIT utilisateurs.email : ${corps:0:120}"
    fi

    # Supprimer viderait en silence l'historique des affectations
    # (tickets.assigne_a_id est en « on delete set null ») en laissant vivre la
    # ligne auth.users correspondante. La règle du projet est la désactivation.
    corps="$(curl -s -X DELETE "$SB_URL/rest/v1/utilisateurs?id=eq.$moi" \
      -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
      -H "Prefer: return=representation")"
    if echo "$corps" | grep -q '"code"'; then
      reussite "la suppression d'un compte est refusée (on désactive)"
    else
      echec "un administrateur a SUPPRIMÉ un compte : ${corps:0:120}"
    fi

    # Dernier administrateur actif : le déclencheur proteger_dernier_admin doit
    # refuser la rétrogradation. Le test n'a de sens — et n'est sans danger —
    # que s'il n'existe qu'un seul administrateur actif.
    nb_admins="$(curl -s "$SB_URL/rest/v1/utilisateurs?select=id&role=eq.admin&actif=is.true" \
      -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" | grep -o '"id"' | wc -l | tr -d ' ')"
    if [ "$nb_admins" = "1" ]; then
      cat > "$tmp/retrogradation.json" <<'JSON'
{"role":"technicien"}
JSON
      corps="$(curl -s -X PATCH "$SB_URL/rest/v1/utilisateurs?id=eq.$moi" \
        -H "apikey: $SB_ANON" -H "Authorization: Bearer $jeton" \
        -H "Content-Type: application/json" -H "Prefer: return=representation" \
        --data-binary "@$tmp/retrogradation.json")"
      if echo "$corps" | grep -q '"code"'; then
        reussite "le dernier administrateur actif ne peut pas être rétrogradé"
      else
        echec "le DERNIER administrateur a été rétrogradé — relancez npm run db:reset : ${corps:0:120}"
      fi
    else
      printf '  (ignoré : %s administrateurs actifs, ce test en exige un seul)\n' "$nb_admins"
    fi
  fi
fi

titre "6. Inventaire structurel (pile locale uniquement)"

# Ces contrôles interrogent le catalogue Postgres : ils ne passent pas par l'API
# REST et ne sont donc possibles qu'avec un accès direct à la base.
if docker exec supabase_db_cesihelpdesk true 2>/dev/null; then
  psql_local() { docker exec supabase_db_cesihelpdesk psql -U postgres -d postgres -tAc "$1" 2>/dev/null; }

  sans_rls="$(psql_local "select count(*) from pg_tables where schemaname='public' and not rowsecurity")"
  if [ "${sans_rls:-1}" = "0" ]; then
    reussite "toutes les tables de public ont RLS activé"
  else
    echec "$sans_rls table(s) de public SANS RLS — elles sont grandes ouvertes"
  fi

  # Une table avec RLS mais sans aucune politique est inaccessible à tout le
  # monde : la panne est silencieuse et se manifeste par des listes vides.
  #
  # `configuration` est exclue : elle est VOLONTAIREMENT sans politique. Elle
  # contient le secret partagé des notifications et ne doit être lisible que par
  # `service_role` et les fonctions `security definer`, jamais par l'API REST.
  sans_policy="$(psql_local "select count(*) from pg_tables t left join pg_policies p on p.schemaname=t.schemaname and p.tablename=t.tablename where t.schemaname='public' and t.rowsecurity and p.policyname is null and t.tablename <> 'configuration'")"
  if [ "${sans_policy:-1}" = "0" ]; then
    reussite "aucune table avec RLS mais sans politique"
  else
    echec "$sans_policy table(s) avec RLS et AUCUNE politique — inaccessibles"
  fi

  # Toute fonction security definer sans search_path figé est une élévation de
  # privilèges potentielle.
  sans_search_path="$(psql_local "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proconfig is null")"
  if [ "${sans_search_path:-1}" = "0" ]; then
    reussite "toutes les fonctions security definer ont un search_path figé"
  else
    echec "$sans_search_path fonction(s) security definer sans search_path figé"
  fi
else
  printf '  (ignoré : pile locale non démarrée)\n'
fi

titre "Résultat"
printf '  %d réussite(s), %d échec(s)\n\n' "$ok" "$ko"
[ "$ko" -eq 0 ]
