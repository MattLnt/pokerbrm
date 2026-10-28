-- L'heure habituelle d'un tournoi se choisit maintenant à l'heure ET au quart
-- d'heure : beaucoup partent à la demie, et deux tournois rangés dans la même
-- tranche de la grille ne se jouent pas au même moment.
--
-- Colonne nullable, sans reprise des données : les 49 modèles existants
-- restent à l'heure pile, ce qu'ils disaient déjà.

ALTER TABLE "TournamentTemplate" ADD COLUMN IF NOT EXISTS "usualMinute" INTEGER;
