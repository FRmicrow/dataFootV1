---
name: authentication-best-practices
description: "Appliquer les bonnes pratiques d'auth. Utiliser quand on sécurise des endpoints ou conçoit une politique d'accès."
risk: critical
---

## When to use
Utilisez cette compétence pour la mise en place ou l’amélioration des mécanismes d’authentification de votre application.

## Instructions
1. Stockez les mots de passe en utilisant des algorithmes de hachage solides (Argon2, bcrypt) avec un sel unique par utilisateur.
2. Établissez des règles de création de mot de passe : longueur minimale, complexité, et encouragez les utilisateurs à les renouveler régulièrement.
3. Mettez en place l’authentification multi-facteurs (MFA) pour renforcer la sécurité, en particulier pour les comptes à privilèges.
4. Utilisez des sessions ou des jetons avec une durée de vie limitée, et implémentez un mécanisme de rafraîchissement et de révocation.
5. Protégez les points d’authentification contre les attaques par force brute (détection de tentatives répétées, délai ou captcha).
6. Préparez des procédures de réinitialisation sécurisées : envoi de lien temporaire, vérification d’identité, gestion de la validité du lien.

## Example
Lors de l’enregistrement, hachez le mot de passe avec Argon2, stockez le résultat avec un sel. À la connexion, comparez le hachage calculé avec celui stocké. Proposez ensuite la configuration d’une double authentification via une application OTP.

## Limitations
Cette compétence ne traite pas des protocoles d’authentification fédérée (OAuth, SAML). L’autorisation (vérification des droits) est abordée dans la compétence `authentication-authorization`.