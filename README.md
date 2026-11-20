# Roulette Review

Application web de revue croisée de projets Swift pour étudiants, avec espace administrateur et tirage au sort équitable (« roulette »).

- **Étudiants** : inscription avec code de groupe unique, dépôt du lien GitHub, revue anonyme de 2 projets attribués, consultation de la note et des commentaires anonymes reçus.
- **Admin** : création des emplacements / codes d'invitation, ouverture/fermeture manuelle des phases, lancement du tirage animé, suivi des reviews avec identité réelle, réouverture ponctuelle, exports CSV complets, journal d'audit.
- **Tirage** : graphe dirigé 2-régulier garantissant que **chaque groupe review 2 projets** et **chaque projet reçoit 2 reviews**, sans auto-review ni doublon.
- **Grille (0-10, bienveillante)** : Propreté (20%), Architecture (20%), Tests unitaires (15%), Tests UI (10%), Commentaires & docs (15%), Historique Git (20%). Note finale sur 20.

---

## Démarrage rapide avec Docker

### 1. Préparer l'environnement

```bash
cp .env.example .env
```

Éditez `.env` et définissez au minimum :
- `ADMIN_PASSWORD` : mot de passe fort pour l'accès `/admin`.
- `SESSION_SECRET` : chaîne aléatoire d'au moins 32 caractères.
- `NUM_GROUPS` : 10 par défaut (modifiable entre 4 et 30).

### 2. Lancer l'application

```bash
docker compose up -d --build
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

- Accueil étudiant : `http://localhost:3000/`
- Administration : `http://localhost:3000/admin`
- Healthcheck : `http://localhost:3000/api/health`

### 3. Sauvegarder la base de données

La base SQLite est stockée dans le volume `roulette-data` (`/data/app.db`).

Pour faire une sauvegarde à chaud :

```bash
docker compose exec roulette sqlite3 /data/app.db ".backup /data/backup.db"
docker compose cp roulette:/data/backup.db ./backup-$(date +%F).db
```

---

## Déploiement self-hosted & accès étudiant (HTTPS)

Les étudiants devant accéder au site depuis l'extérieur, deux options simples :

### Option A : Cloudflare Tunnel (Recommandé — gratuit, pas d'ouverture de port)

1. Installez `cloudflared` sur la machine hôte.
2. Créez un tunnel pointant vers `http://localhost:3000`.
3. Vous obtenez un sous-domaine HTTPS propre (ex: `https://revue.votredomaine.fr`) sans exposer votre box.

### Option B : Reverse-proxy Caddy / Traefik

Ouvrez les ports 80/443 de votre box vers votre machine et configurez un Caddyfile :

```caddy
revue.mondomaine.fr {
    reverse_proxy localhost:3000
}
```

---

## Développement local

Prérequis : Node.js 22+, npm 11+.

```bash
# Installation
npm install

# Tests unitaires
npm test

# Lint & Typecheck
npm run lint
npm run typecheck

# Démarrer en développement
npm run dev

# Build de production
npm run build
npm start
```

---

## Déroulement d'une session

1. **Phase Préparation (`SETUP`)**
   - Connectez-vous sur `/admin`.
   - Rendez-vous sur **Groupes** pour générer les 10 codes.
   - Cliquez sur **Ouvrir les inscriptions** depuis le tableau de bord.
2. **Phase Inscriptions (`INSCRIPTIONS`)**
   - Distribuez les liens d'invitation (bouton « Copier le lien » pour chaque groupe).
   - Chaque groupe choisit son mot de passe, nom, membres et colle son lien GitHub.
3. **Phase Tirage (`DRAW`)**
   - Une fois tous les groupes inscrits, cliquez sur **Lancer la roulette**.
   - Le tirage est calculé et révélé de façon animée.
   - Vous pouvez « Re-tirer » si besoin tant que les reviews ne sont pas ouvertes.
4. **Phase Reviews (`REVIEWS`)**
   - Cliquez sur **Ouvrir les reviews**. Les dépôts sont alors verrouillés.
   - Les étudiants se connectent sur `/` et remplissent la grille pour leurs 2 projets.
   - Le brouillon s'enregistre automatiquement. La soumission est définitive (l'admin peut réouvrir une review ponctuellement si nécessaire).
5. **Phase Clôture (`CLOSED`)**
   - Cliquez sur **Clôturer et publier**.
   - Les étudiants voient leur note sur 20 et les commentaires anonymes reçus.
   - L'admin exporte les résultats en CSV (groupes, affectations, reviews détaillées, moyennes).
