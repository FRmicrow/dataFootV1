---
name: authentication-authorization
description: "Sécuriser l'accès aux ressources. Utiliser quand on protège des routes, implémente JWT, sessions ou contrôle de rôles."
risk: critical
---

## When to use
Activez cette compétence lorsque vous devez restreindre l’accès à des ressources ou actions en fonction de l’identité et du rôle de l’utilisateur.

## Instructions
1. Choisissez un mécanisme d’authentification (sessions, JWT, OAuth) adapté à votre architecture.
2. Implémentez une procédure d’inscription et de connexion sécurisée (hachage des mots de passe, validation d’e‑mail).
3. Générez un jeton ou une session à chaque authentification et stockez les droits de l’utilisateur (rôles, permissions).
4. Protégez les routes sensibles via un middleware qui vérifie le jeton/la session et l’autorisation associée.
5. Limitez la durée de vie des identifiants et prévoyez des mécanismes de révocation en cas de compromission.
6. Journalisez les tentatives d’authentification suspectes et appliquez des mesures anti-brute-force (verrouillage de compte, captchas).

## Example
Pour un endpoint administratif :  
- Le middleware vérifie la présence d’un JWT valide.  
- Le payload du jeton contient un rôle `admin`.  
- Si le rôle n’est pas présent, la route renvoie un code 403 (Forbidden).

## Limitations
Cette compétence traite de l’authentification et de l’autorisation internes. Les intégrations avec des identités externes (LDAP, SSO) demandent des configurations supplémentaires.