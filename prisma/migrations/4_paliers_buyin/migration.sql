-- Les paliers de bankroll ne se parlent plus en ABI mais en buy-in max, et
-- l'échelle (5 / 10 / 20 / 50 €, avec seuils de montée et de descente) est
-- désormais une constante de l'app — `PALIERS_BUYIN` dans lib/constants.js.
--
-- Rien ne modifiait ces deux tables à l'exécution : elles ne contenaient que
-- des valeurs d'amorçage, recopiées à chaque déploiement. Les garder vides
-- derrière un code qui ne les lit plus coûterait plus cher que les retirer.

DROP TABLE IF EXISTS "BankrollLevel";
DROP TABLE IF EXISTS "BankrollRule";
