---
name: accessibility-and-ux
description: "Améliorer l’accessibilité et l’expérience utilisateur des interfaces."
risk: none
---

## When to use
Servez-vous de cette compétence pour vérifier et améliorer l’accessibilité et l’utilisabilité de vos interfaces.

## Instructions
1. Utilisez des balises HTML sémantiques et respectez la structure logique des documents (nav, main, footer) pour aider les technologies d’assistance.
2. Associez des labels et attributs ARIA aux champs de formulaire et aux contrôles interactifs.
3. Contrôlez le contraste des couleurs et la taille des polices pour garantir la lisibilité.
4. Facilitez la navigation au clavier en gérant les ordres de tabulation et le focus.
5. Testez vos pages avec des outils d’audit (Lighthouse, axe) et corrigez les problèmes identifiés.

## Example
Pour un bouton qui déclenche une action, utilisez `<button aria-label="Supprimer">` au lieu d’un `<div>` cliquable et assurez-vous que l’utilisateur puisse activer ce bouton via la touche `Entrée` ou `Espace`.

## Limitations
Cette compétence aborde l’accessibilité technique et l’UX de base. Des études d’ergonomie plus poussées (tests utilisateurs) peuvent être nécessaires pour optimiser l’expérience.