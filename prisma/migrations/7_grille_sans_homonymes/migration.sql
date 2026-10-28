-- La grille n'a plus de clé d'unicité sur (room, nom, buy-in, prime).
--
-- Une room fait tourner le même tournoi plusieurs fois par jour, au même
-- buy-in : deux « MYSTERY KO 10 € », l'un à 11 h et l'autre à 14 h, sont deux
-- lignes légitimes. Ce qui les distingue est l'heure de lancement, pas le nom
-- — et la contrainte refusait d'en enregistrer une deuxième.
--
-- Rien ne remplace la contrainte : c'est au joueur de tenir sa grille, et
-- chaque ligne se supprime d'un bouton.

DROP INDEX IF EXISTS "TournamentTemplate_userId_siteId_name_buyIn_bounty_key";
