# petclinic-backend — Project Memory
Auto-loads only for conversations rooted here; the repo root [AGENTS.md](../AGENTS.md) applies everywhere.

## Backend Architecture

**Layered Structure:**
1. REST Controllers (`src/main/java/.../rest/`) - expose API endpoints
2. Mappers (`mapper/`) - hand-written `@Component` entity↔DTO conversion
3. Repository Layer (`repository/`) - Spring Data JPA interfaces (no service layer!)
4. Domain Model (`domain/`) - JPA entities (Owner, Pet, Vet, Visit, Specialty, PetType, User, Role)
5. Notification (`notification/`) - `NotificationServiceClient`, called after a visit is booked:
   an HTTP POST to notification-service, best effort (a failure is logged, the booking stands).
   Takes plain values, never an entity, and reaches no repository

**Data Flow:**
Request → REST Controller → Repository / Mapper → JPA Entity
Response ← REST Controller ← Mapper (Entity→DTO) ← Repository

**Key Patterns:**
- DTOs are hand-written (not generated) in `src/main/java/.../rest/dto/`
- `/openapi.yaml` (repo root) is generated (don't edit it!) from Java DTOs & REST Controllers by `OpenApiExtractorTest`

Before changing how the layers, the database or the notification call work, read the decisions
and their reasons in [ARCHITECTURE.md](../ARCHITECTURE.md). When a guardrail test fails, or a
living diagram no longer matches the code, see [GUARDRAILS.md](../GUARDRAILS.md).

## Database
- **Dev:** Embedded PostgreSQL via `../start-database.sh` (Java jar, localhost:5432)
- **Tests:** Embedded PostgreSQL (auto-started in-process, no setup needed)
- **Flyway boots from three locations** (`ddl-auto=none`); an empty DB before that is normal.
  `src/main/resources/db/migration/` is the versioned **schema** chain — no rows here, ever: seed
  data in a frozen migration is what forced the old V5/V7/V8 to patch each other.
  `src/main/resources/db/reference/R__reference.sql` holds the lookup rows every environment
  needs (pet types, specialties), as a repeatable upsert with literal ids.
  `src/main/resources/db/seed/R__seed.sql` is the demo **dataset** ("Default"), repeatable, so
  edit it freely; it re-runs on checksum change after all versioned migrations and after the
  reference rows, opening with `TRUNCATE ... RESTART IDENTITY` (ids are deterministic — owner 1 =
  Kevin McCallister, pet 3 = Milton). A second dataset = a sibling location reusing the name
  `R__seed.sql`, picked by swapping `spring.flyway.locations`; Flyway refuses to boot on two
  resolved migrations sharing one description, so two can never both apply.
- **Tests start on an empty database** (schema + reference rows), never on the seed:
  `src/test/resources/config/application.properties` drops `db/seed` and gives every test method
  a fresh Zonky copy. A test that reads seeded rows declares it — `@DefaultFixture` (Spring),
  `test.use({dbFixture: 'default'})` (Playwright), `@fixture:default` (Cucumber).
- ⚠️ `../start-database.sh` starts by `rm -rf data`, wiping any rows added at runtime. Use it only
  for a deliberate reset; to keep runtime data, start Postgres from the jar directly.

## API Endpoints
Backend exposes REST API at http://localhost:8080/api/. Full REST contract: generated
[`openapi.yaml`](../openapi.yaml) (repo root) — kept in sync by `OpenApiExtractorTest`, don't
hand-edit it.

## Domain Model
Core entities and relationships:
- **Owner** 1→N **Pet** N→1 **PetType**
- **Pet** 1→N **Visit**
- **Vet** N→N **Specialty** (via `vet_specialties` join table)
- **User** 1→N **Role**
