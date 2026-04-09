---
name: form-validation
description: "Valider les formulaires React côté client. Utiliser quand on crée un formulaire avec retour d'erreur utilisateur."
risk: safe
---

## When to use
Activez cette compétence pour toutes les vues collectant des entrées utilisateur afin de garantir la cohérence et la validité des données envoyées au backend.

## Instructions
1. Spécifiez les règles de validation pour chaque champ (format, longueur, exigences de correspondance).
2. Implémentez la validation avec une bibliothèque comme Yup ou Zod associée à un gestionnaire de formulaire (Formik, React Hook Form).
3. Affichez des messages d’erreur près des champs correspondants et empêchez la soumission tant que le formulaire n’est pas valide.
4. Nettoyez et normalisez les entrées (trim des espaces, uniformisation de la casse) avant de les envoyer.
5. Testez votre formulaire pour s’assurer que les validations ne gênent pas l’expérience utilisateur (messages clairs et pas trop intrusifs).

## Example
Dans un formulaire d’inscription : validez l’adresse e‑mail avec une regex, vérifiez la concordance des mots de passe, et assurez-vous que l’utilisateur coche la case d’acceptation des CGU.

## Limitations
Le contrôle client ne dispense pas de la validation serveur. Les règles complexes ou les vérifications auprès de bases de données doivent être effectuées côté backend.