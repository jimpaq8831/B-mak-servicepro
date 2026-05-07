# 🚀 Guide d'installation — B-Mak ServicePro
## Mac + iPhone, sync en temps réel, 15 minutes

---

## ÉTAPE 1 — Créer ton compte Supabase (base de données)

1. Va sur **https://supabase.com**
2. Clique **"Start your project"** → **"Sign up"**
3. Crée un compte avec ton courriel (gratuit, aucune carte requise)
4. Une fois connecté, clique **"New project"**
5. Remplis :
   - **Name:** `bmak-servicepro`
   - **Database Password:** choisis un mot de passe fort (note-le)
   - **Region:** `US East` (ou `Canada` si disponible)
6. Clique **"Create new project"** — attends ~2 minutes que ça démarre

---

## ÉTAPE 2 — Créer les tables dans Supabase

1. Dans ton projet Supabase, clique **"SQL Editor"** dans le menu de gauche
2. Clique **"New query"**
3. Ouvre le fichier `supabase_schema.sql` inclus dans ce dossier
4. **Copie tout le contenu** et **colle-le** dans l'éditeur SQL
5. Clique **"Run"** (bouton vert) — tu devrais voir "Success"

---

## ÉTAPE 3 — Copier tes clés Supabase

1. Dans le menu de gauche, clique **"Project Settings"** (icône ⚙️)
2. Clique **"API"**
3. Tu vas voir deux valeurs — **copie-les** :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon public key** → longue chaîne de caractères

4. Ouvre le fichier **`db.js`** dans un éditeur de texte (TextEdit sur Mac)
5. Remplace les deux lignes au début du fichier :
   ```
   const SUPABASE_URL = 'VOTRE_SUPABASE_URL';
   const SUPABASE_KEY = 'VOTRE_SUPABASE_ANON_KEY';
   ```
   Par tes vraies valeurs :
   ```
   const SUPABASE_URL = 'https://abcdefgh.supabase.co';
   const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsIn...';
   ```
6. **Sauvegarde** le fichier

---

## ÉTAPE 4 — Créer ton compte Netlify et déployer

1. Va sur **https://netlify.com**
2. Clique **"Sign up"** → **"Sign up with email"** (gratuit)
3. Une fois connecté, tu arrives sur le dashboard
4. **Glisse-dépose** le dossier `BMak_ServicePro` directement dans la zone grise
   **"Drag and drop your site folder here"**
5. Netlify déploie automatiquement — ça prend ~30 secondes
6. Tu obtiens une URL comme **`https://quirky-tesla-abc123.netlify.app`**

---

## ÉTAPE 5 — (Optionnel) Donner un vrai nom à l'URL

1. Dans Netlify, clique sur ton site
2. Clique **"Site configuration"** → **"Change site name"**
3. Écris par exemple `bmak-servicepro`
4. Ton URL devient **`https://bmak-servicepro.netlify.app`** ✅

---

## ÉTAPE 6 — Installer l'app sur iPhone

1. Ouvre Safari sur ton iPhone
2. Va sur ton URL Netlify (ex: `https://bmak-servicepro.netlify.app`)
3. Attends que la page charge complètement
4. Appuie sur le bouton **Partager** (carré avec flèche ↑) en bas de Safari
5. Fais défiler vers le bas et appuie **"Sur l'écran d'accueil"**
6. Clique **"Ajouter"**
7. L'icône **B-Mak ServicePro** apparaît sur ton écran d'accueil 🎉

---

## ÉTAPE 7 — Installer l'app sur Mac (Chrome)

1. Ouvre Chrome sur ton Mac
2. Va sur ton URL Netlify
3. Dans la barre d'adresse, clique l'icône **⊕** (à droite)
4. Clique **"Installer B-Mak ServicePro"**
5. L'app s'ouvre comme une vraie application native ✅

---

## ✅ Résultat final

| Appareil | Accès | Données |
|----------|-------|---------|
| Mac (Chrome) | App installée ou navigateur | ☁️ Cloud Supabase |
| iPhone (Safari) | Icône sur écran d'accueil | ☁️ Cloud Supabase |
| N'importe quel appareil | URL Netlify | ☁️ Toujours synchronisé |

**Hors-ligne** : L'app fonctionne même sans internet. Les données créées hors-ligne se synchronisent automatiquement dès que la connexion revient.

---

## ❓ Questions fréquentes

**Les 415 clients et 1024 machines sont-ils déjà dans l'app ?**
Oui — au premier démarrage, l'app détecte que la base de données est vide et importe automatiquement toutes tes données.

**C'est gratuit pour combien de temps ?**
Supabase : gratuit jusqu'à 500 MB de données et 50 000 requêtes/mois (très largement suffisant).
Netlify : gratuit jusqu'à 100 GB de bande passante/mois.

**Comment mettre à jour l'app si on ajoute des fonctionnalités ?**
Glisse-dépose le nouveau dossier sur Netlify — ça se met à jour en 30 secondes, sans perdre les données.

**Quelqu'un d'autre peut accéder à mes données ?**
Non. Supabase utilise une clé anonyme qui protège l'accès. Pour plus de sécurité, on peut ajouter une authentification par courriel/mot de passe.
