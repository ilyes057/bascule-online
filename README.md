# BASCULE Online — Les Cités Reliées

**Version : MVP multijoueur 0.1.0 — jouable localement et déployable.**

Le moteur reprend les règles du prototype BASCULE V2 validé. Il est exécuté **uniquement sur le serveur**, et les interfaces PC/téléphone affichent le même état partagé. Le projet est écrit en HTML, CSS, JavaScript et Node.js, **sans dépendance npm externe**.

## Jouer maintenant (ordinateur)

1. Installer **Node.js 20 ou plus récent** : https://nodejs.org/
2. Décompresser le ZIP et ouvrir un terminal **dans le dossier `bascule-online`**, celui qui contient `server.js`.
3. Exécuter :

   ```bash
   npm start
   ```

4. Ouvrir `http://localhost:3000` dans Chrome, Edge, Firefox ou Safari.
5. Choisir un pseudo et la langue, puis **Créer un salon**.
6. Sur un autre navigateur / ordinateur, ouvrir le site, saisir le code à six caractères et **Rejoindre**.
7. L'hôte lance la partie quand au moins **2 joueurs** sont présents (4 maximum).

Sur deux ordinateurs du **même réseau Wi-Fi**, le second peut utiliser `http://ADRESSE_IP_DU_PC_SERVEUR:3000` (autoriser le port 3000 dans le pare-feu). Sur téléphone, l'interface s'adapte automatiquement. **Attention : le chat vocal nécessite HTTPS ou localhost** pour obtenir l'accès au micro. Un téléphone connecté à une adresse HTTP privée peut jouer, mais son micro risque de ne pas être accessible. Le déploiement HTTPS ci-dessous règle ce point.

Tester la logique et le serveur :

```bash
npm test
```

## Ce qui fonctionne dans ce MVP

| Fonctionnalité | Statut |
| --- | --- |
| Salons privés, codes d'invitation, 2 à 4 humains | Implémenté |
| Les 24 machines, modes A/B, 18 contrats | Implémenté |
| 3 projets publics, 3 étapes finales, récompenses | Implémenté |
| Réseau d'inventions, licences, protocole, anomalie | Implémenté |
| 14 manches, 3 actions / tour, enchères 4/8/12 | Implémenté |
| Validation anti-triche des actions côté serveur | Implémenté (MVP) |
| Événements visuels et historique après reconnexion | Implémenté |
| Chat écrit en direct | Implémenté |
| Choix individuel français/anglais/arabe (RTL) | Implémenté (traductions encore à affiner) |
| Interface écran PC et navigation tactile mobile | Implémenté |
| Reconnexion au même siège grâce à un jeton du navigateur | Implémenté |
| Vocal facultatif WebRTC, micro marche/arrêt | Implémenté, à tester sur de vrais réseaux/appareils |
| Sauvegarde durable Supabase | Disponible par configuration (facultative) |
| Comptes, matchmaking public, classements permanents | Non prévus dans le MVP |
| Tests ergonomiques avec vrais joueurs, audit de sécurité, TURN | À faire |

## Architecture

```text
Navigateur PC / téléphone 1 ─┐
Navigateur PC / téléphone 2 ─┼── HTTPS + WebSocket ── Serveur Node.js
Navigateur PC / téléphone 3 ─┘                       │
                                                  Moteur des règles
                                                  Salons / tours / enchères
                                                  Chat + événements
                                                  Stockage local provisoire
                                                  │
                                                  └── Supabase (optionnel)

Audio (facultatif) : navigateur ↔ WebRTC ↔ navigateur
                      └─ messages de signalisation via le serveur Node
```

**Le serveur est la source de vérité.** Les joueurs envoient des intentions (`build`, `activate`, `contribute`, etc.), il vérifie le tour, les coûts et les conditions, puis diffuse le nouvel état et les événements. Le client n'ajoute aucune ressource par lui-même.

### Fichiers importants

- `server.js` : serveur HTTP, WebSocket, salons, validation des actions, chat, signalisation vocal, gestion des reconnexions.
- `src/engine.js` : moteur BASCULE V2 extrait du prototype approuvé.
- `src/cloud-store.js` : connexion facultative à Supabase REST.
- `public/index.html` : structure des écrans.
- `public/style.css` : design responsive PC / mobile.
- `public/app.js` : interface, interactions, traductions, animations et WebRTC.
- `public/catalog.json` : catalogue des machines/contrats.
- `public/assets` : images graphiques du prototype.
- `tests/*.test.js` : tests du moteur et de deux clients WebSocket.
- `render.yaml` : configuration Render gratuite.
- `supabase.sql` : table facultative pour sauvegarder les salons.

## Mettre le jeu sur Internet gratuitement

### Héberger le serveur et le site avec Render

1. Créer un dépôt **GitHub** contenant **les fichiers de ce dossier** (avec `server.js` et `package.json` à la racine).
2. Se connecter à **https://dashboard.render.com/**.
3. Choisir **New > Web Service** puis connecter le dépôt GitHub.
4. Choisir l'instance **Free** si elle est disponible dans votre compte.
5. Vérifier : Runtime `Node`, Build command `npm install --omit=dev`, Start command `npm start`.
6. Déployer. Vous obtiendrez une URL `https://...onrender.com`. Partager cette URL à tous les joueurs, **téléphones compris**. Render gère HTTPS et WSS.

Vous pouvez aussi utiliser le fichier `render.yaml` via les **Blueprints** Render.

**Limites de la gratuité de Render** : mise en veille après inactivité, délai au réveil, quotas mensuels et surtout **système de fichiers éphémère**. Sans Supabase, les parties peuvent être perdues quand l'instance redémarre, se redéploie ou s'endort. Ne pas considérer ce stockage comme durable.

### Ajouter Supabase gratuitement pour conserver les parties

1. Créer un projet sur **https://supabase.com/**.
2. Ouvrir **SQL Editor** et exécuter le contenu de `supabase.sql`.
3. Dans les **variables d'environnement privées de Render**, ajouter :

   ```text
   SUPABASE_URL=https://VOTRE_PROJET.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_PRIVEE_SERVICE_ROLE
   ```

4. Redéployer / redémarrer Render. Le serveur lit les salons depuis Supabase au démarrage et les sauvegarde à chaque changement, avec une temporisation courte.
5. **Ne jamais mettre la clé `service_role` dans `public/`, GitHub ou un message public.** Elle ne doit exister que dans les secrets du serveur.

Le chat des salons fait partie de l'état sauvegardé. C'est un premier stockage de développement, **pas une politique de conservation finalisée**. Pour une mise en production publique, prévoir purge, sécurité, rate limiting avancé, modération et séparation de données par utilisateur.

## Chat vocal : ce qui est possible et ce qui ne l'est pas encore

- Appuyer sur **Rejoindre le vocal**, puis accepter l'autorisation de micro du navigateur. Le chat vocal **n'est jamais activé automatiquement**.
- Boutons pour couper/réactiver le micro et quitter le canal vocal.
- Pour 2–4 joueurs : communications audio **pair-à-pair** via WebRTC, sans transmission du son au serveur BASCULE.
- Le serveur transmet seulement les offres/réponses WebRTC et les informations de connexion (signalisation).
- Un serveur **STUN** est prévu, mais **pas de relais TURN** dans ce MVP. Certains réseaux d'entreprise, mobiles ou NAT stricts nécessitent TURN : dans ces situations, le jeu écrit fonctionne, le vocal peut échouer.
- Les navigateurs mobiles peuvent suspendre l'audio quand le jeu est en arrière-plan. Il faut tester Android Chrome et iOS Safari sur de vrais appareils.
- Sur un site public, utiliser impérativement **HTTPS** (fourni par Render).

## Remarques sur le MVP et la qualité

Ce dépôt est un **premier jeu en ligne fonctionnel**, non un service public terminé. Avant de l'ouvrir à beaucoup de joueurs, il faudra en particulier ajouter des timers/abandons pour les joueurs déconnectés, une solution TURN pour la voix, un système de sauvegarde et reconnexion validé sous charges réelles, une modération du chat, des protections contre spam/flood, des tests humains d'ergonomie et un audit de sécurité. L'application utilise une implémentation légère des WebSocket pour éviter les dépendances, à remplacer idéalement par une bibliothèque maintenue pour un déploiement de production à grande échelle.

Le jeu requiert une connexion Internet pour les parties distantes et **ne joue pas hors ligne** ; l'icône PWA permet seulement de l'ajouter à l'écran d'accueil du téléphone selon les possibilités du navigateur.


## Mise à jour v0.2 : chat, vocal, sortie

- **Entrée** ouvre le chat lorsque le focus n'est pas dans un champ ou un bouton. Entrée dans le champ envoie le message.
- **↩ Quitter la partie** apparaît dans l'en-tête (également dans le menu mobile) : confirmation, retour à l'accueil. Avant le lancement, libère une place dans le salon. Pendant une partie, abandonne la place de façon permanente ; les autres peuvent finir sans être bloqués.
- **Vocal** : le serveur partage désormais les membres actifs du canal, y compris aux derniers arrivés ; l'interface indique l'état de connexion, et propose de réessayer ou de réactiver le son lorsque le navigateur bloque la lecture.
- **Important WebRTC** : le STUN existant reste gratuit, mais certains réseaux mobiles/entreprises imposent un relais TURN. Sans TURN configuré, nous ne garantissons pas le fonctionnement du vocal entre tous les réseaux. Tester à deux appareils réels sur HTTPS.

Pour déployer : remplacer les fichiers du dépôt GitHub par ceux de cette archive, faire un commit puis pousser sur `main`. Render (déploiement automatique activé) récupère la mise à jour. Tester dans un nouveau salon après redéploiement.
