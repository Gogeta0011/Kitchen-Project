# Database Schema & Entity Relationships

PostgreSQL, 17 tables. The authoritative source is
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) — every table
below is a Prisma `model`, every relationship an `@relation`.

## The big picture

Two **hub** tables carry everything:

- **`User`** — the login account *and* the public "chef" profile (name, bio,
  avatar, follower counts). These were originally two tables (`User` + `Chef`)
  and were merged into one.
- **`Recipe`** — owned by a user via `Recipe.creatorId → User.id`.

Recipe ingredients and steps are **normalized** into their own tables (they used
to be JSON blobs), so you can query across them.

## Tables by domain

**Accounts**
- `User` — `id`, `username` (unique), `email` (unique), `password`, `isAdmin`,
  email-verification fields, profile (`name`, `avatarKey`, `avatarUrl`, `bio`,
  `specialty`, `handle`, `followers`, `following`).

**Recipe content**
- `Recipe` — `id`, `title`, `creatorId`→User, image, `prepTime`/`cookTime`/
  `servings`/`difficulty`/`category`/`cuisine`/`diet`, `tags` (string array),
  `rating`/`reviews` (denormalized counters), `deletedAt` (soft delete).
- `RecipeStep` — `recipeId`, `stepNo`, `text`. Ordered steps.
- `Ingredient` — `id`, `name` (unique), `defaultUnit`. A shared lookup list.
- `RecipeIngredient` — junction: `recipeId`, `ingredientId`, `quantity`, `unit`,
  `position`.

**Engagement**
- `Comment` — `recipeId`, `userId`, `body`. Many per user per recipe.
- `Rating` — `recipeId`, `userId`, `stars`. **One per user per recipe.**
- `RecipeLike` — `recipeId`, `userId`. One per user per recipe.
- `Collection` — `userId`, `name`. Named lists. One name per user.
- `CollectionRecipe` — junction: `collectionId`, `recipeId`.
- `SavedRecipe` — `userId`, `recipeId`, `collectionName`. (Legacy favorites.)
- `Follow` — junction on **User↔User**: `followerId`, `followingId`.

**Activity**
- `Notification` — `userId` (recipient), `type`, `actorId`, `recipeId`, `body`,
  `read`.
- `PickerHistory` — logs the recipe-picker recommendations.
- `AuditLog` — `userId`, `action`, `resource`, `status`, IP, user-agent.

**Commerce (future — no API routes yet)**
- `Product` — `name`, `price`, `stock`, `imageKey`.
- `CartItem` — junction on **User↔Product**: `userId`, `productId`, `quantity`.

## Relationships

### One-to-many (the FK lives on the child)
| Parent | → Children (foreign key on child) |
|---|---|
| **User** | Recipe `creatorId` · Comment `userId` · Rating `userId` · Collection `userId` · SavedRecipe `userId` · Notification `userId` · AuditLog `userId` · CartItem `userId` |
| **Recipe** | RecipeStep `recipeId` · Comment `recipeId` · Rating `recipeId` · RecipeLike `recipeId` · SavedRecipe `recipeId` · PickerHistory `recipeId` |
| **Ingredient** | RecipeIngredient `ingredientId` |
| **Collection** | CollectionRecipe `collectionId` |
| **Product** | CartItem `productId` |

### Many-to-many (via a junction table)
| Relationship | Junction table | Pair |
|---|---|---|
| Recipe ↔ Ingredient | `RecipeIngredient` | (recipeId, ingredientId) |
| Recipe ↔ Collection | `CollectionRecipe` | (collectionId, recipeId) |
| User ↔ Recipe (likes) | `RecipeLike` | (userId, recipeId) |
| User ↔ Product (cart) | `CartItem` | (userId, productId) |
| **User ↔ User** (follow) | `Follow` | (followerId, followingId) |

## Things worth knowing
- **Cascade deletes:** nearly every foreign key is `onDelete: Cascade` — delete a
  recipe and its steps/ingredients/comments/ratings/likes go with it. The
  exception is `AuditLog.userId` (`SetNull`), so audit history survives.
- **"One-per" rules** are enforced by unique constraints: one rating, one like,
  one saved-recipe per user per recipe; one collection name per user. Comments
  are intentionally *not* constrained (a user may comment many times).
- **Two loose links** are deliberately *not* foreign keys: `Notification.actorId`
  and `Notification.recipeId` are plain strings, so deleting a recipe/user won't
  wipe notification history.
- **Denormalized counters** kept in sync by the app (not relationships):
  `Recipe.rating` / `Recipe.reviews`, `User.followers` / `User.following`.
