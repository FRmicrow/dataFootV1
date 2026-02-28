---
name: c4-modelling
description: "Produire des diagrammes C4 pour visualiser les composants et leurs interactions."
risk: none
---

## When to use
Utilisez cette compétence pour partager une vision claire de l’architecture avec des interlocuteurs techniques et non techniques.

## Instructions
1. Créez un diagramme de niveau Contexte pour situer le système étudié parmi les acteurs et systèmes externes (utilisateurs, services tiers).
2. Réalisez un diagramme de niveau Conteneur pour détailler les applications, services, bases de données qui composent votre système.
3. Déclinez un diagramme de niveau Composant pour montrer comment un conteneur est organisé (modules, services, contrôleurs).
4. (Facultatif) Ajoutez un diagramme de niveau Code pour détailler l’organisation interne d’une couche critique (classes, fonctions).
5. Accompagnez chaque diagramme d’une légende décrivant les protocoles, ports et formats utilisés.

## Example
Pour une application de gestion de projets, le diagramme Contexte montre l’utilisateur, l’application web et l’API ; le diagramme Conteneur affiche le frontend, l’API, la base de données et un service externe de paiement ; le diagramme Composant détaille les contrôleurs, services et repositories du module API.

## Limitations
Les diagrammes C4 représentent des structures statiques. Les aspects dynamiques (séquences d’appel, flux de données) doivent être représentés par d’autres diagrammes (séquence, activité).