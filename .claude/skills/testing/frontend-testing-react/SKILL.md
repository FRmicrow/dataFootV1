---
name: frontend-testing-react
description: "Tester les composants React avec Vitest + Testing Library. Utiliser quand on teste le rendu ou les interactions."
risk: safe
---

## When to use
Activez cette compétence pour s’assurer que vos composants React affichent correctement les données et réagissent aux interactions utilisateur comme prévu.

## Instructions
1. Utilisez un outil comme Vitest + @testing-library/react pour rendre le composant en environnement de test.
2. Simulez des interactions utilisateur (clics, saisie de texte) à l’aide des fonctions fournies par la bibliothèque.
3. Vérifiez la présence d’éléments, de textes et d’états via des assertions (par exemple `getByText`, `queryByRole`).
4. Mockez les appels API et les contextes externes pour tester le composant de manière isolée.
5. Mettez à jour les tests lorsque vous modifiez l’interface afin de maintenir la cohérence.

## Example
Pour un composant `LoginForm`, écrivez un test qui saisit une adresse e‑mail et un mot de passe, clique sur le bouton de connexion et vérifie que la fonction `onSubmit` est appelée avec les valeurs saisies.

## Limitations
Cette compétence ne traite pas des tests visuels ou des tests end-to-end, qui nécessitent des outils comme Playwright ou Cypress.