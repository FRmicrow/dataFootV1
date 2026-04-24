# V46 — International Competitions

**Status:** ⏳ AWAITING CONFEDERATION MAPPING

## Scope

1. **Database Migration**
   - Add `confederation` column to `v4.competitions`
   - Create migration to populate confederation values (you provide the mapping)

2. **Backend API**
   - Update `GET /v4/leagues` to:
     - Return international competitions separately
     - Group by confederation within international section

3. **Frontend Layout**
   - Create 2 new accordions:
     - 🏢 "International Club Competitions" (UEFA CL, Copa Libertadores, etc.)
     - 🏳️ "International National Competitions" (World Cup, Euro, Copa America, etc.)
   - Within each, group by confederation sub-sections

## Blocking Issue

⛔ **Missing Data Mapping**: Need you to fill `/docs/features/V46-International-Competitions/confederation_mapping.md` with:
- List of all international competitions in DB
- Their confederation assignment
- Club vs Nation classification

## Next Steps

1. Run the query in `confederation_mapping.md`
2. Fill in the `confederation` column for each competition
3. I'll implement:
   - Migration script
   - Backend grouping logic
   - Frontend accordion UI
   - Tests

**Ready when you provide the mapping!** 🚀
