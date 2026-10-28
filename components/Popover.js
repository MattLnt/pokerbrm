"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MARGE = 8;

/**
 * Panneau flottant ancré sous un élément.
 *
 * Porté dans `<body>` : rendu sur place, il serait coupé par le défilement
 * d'une feuille de saisie ou par n'importe quel `overflow` au-dessus de lui.
 * Il se replace à chaque défilement plutôt que de se fermer — un menu qui
 * disparaît parce qu'on a effleuré la molette est pénible.
 *
 * Il se retourne au-dessus de l'ancre quand il n'y a pas la place en
 * dessous, et sa hauteur est plafonnée à l'espace disponible : le contenu
 * défile, le panneau ne sort jamais de l'écran.
 */
export default function Popover({
  ancre,
  onClose,
  align = "start",
  suivreLargeur = true,
  className = "",
  children,
  ...rest
}) {
  const panneau = useRef(null);
  const [style, setStyle] = useState(null);

  // Posé avant la première peinture, et replacé à chaque fois que l'ancre
  // bouge : on ne le voit jamais passer par le coin haut-gauche.
  useLayoutEffect(() => {
    function placer() {
      const a = ancre.current?.getBoundingClientRect();
      const p = panneau.current;
      if (!a || !p) return;

      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const h = p.offsetHeight;
      const w = p.offsetWidth;

      const placeEnDessous = vh - a.bottom - MARGE * 2;
      const placeAuDessus = a.top - MARGE * 2;
      const auDessus = h > placeEnDessous && placeAuDessus > placeEnDessous;

      let left = align === "end" ? a.right - w : a.left;
      left = Math.min(Math.max(MARGE, left), Math.max(MARGE, vw - w - MARGE));

      setStyle({
        top: auDessus ? Math.max(MARGE, a.top - MARGE - h) : a.bottom + MARGE,
        left,
        maxHeight: Math.max(120, auDessus ? placeAuDessus : placeEnDessous),
        minWidth: suivreLargeur ? a.width : undefined,
      });
    }

    placer();
    // `capture` : le défilement d'un conteneur interne ne remonte pas en
    // phase de bulle, et c'est justement lui qui déplace l'ancre.
    window.addEventListener("scroll", placer, true);
    window.addEventListener("resize", placer);
    return () => {
      window.removeEventListener("scroll", placer, true);
      window.removeEventListener("resize", placer);
    };
  }, [ancre, align, suivreLargeur]);

  useEffect(() => {
    function surTouche(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    function surClic(e) {
      if (
        !panneau.current?.contains(e.target) &&
        !ancre.current?.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener("keydown", surTouche, true);
    document.addEventListener("pointerdown", surClic, true);
    return () => {
      document.removeEventListener("keydown", surTouche, true);
      document.removeEventListener("pointerdown", surClic, true);
    };
  }, [ancre, onClose]);

  return createPortal(
    <div
      ref={panneau}
      // Masqué par l'opacité et non par `visibility` le temps d'être mesuré :
      // `focus()` ne fait rien sur un élément en `visibility: hidden`, et la
      // liste prendrait le clavier dans le vide.
      style={{
        ...style,
        opacity: style ? 1 : 0,
        pointerEvents: style ? undefined : "none",
      }}
      className={`flottant scroll-fin fixed z-[60] overflow-y-auto rounded-tile border border-line-strong bg-surface p-1.5 ${className}`}
      {...rest}
    >
      {children}
    </div>,
    document.body
  );
}
