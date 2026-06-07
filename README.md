# Synonym Dictionary – Full-Stack Developer Assessment

A production-ready, full-stack in-memory synonym search tool. This application allows users
to link as synonyms, and automatically resolves all transitive connections (i.e.,
if B is a synonym of A, and C is a synonym of B, then C is automatically a synonym of A).

This solution was designed with a focus on read performance, thread-safety, and
maintainability.

## Overview
As per the requirements, the Synonym Dictionary lets you add and view synonyms. Since the application should be "production ready", I also added the options to:
- Rename created words
- Delete words
- Unlink words as synonyms

In order to make it easier for the user to correct its own mistakes and typos. I also added the option for users to both search for words, but also to browse for everything in the storeage. As a bonus to the transitive connections rule, I also added a `on hover` for the transitive synonym chips, that displays which synonym it is that connects the two words.

For testing purposes, whenever you launch the app it makes requests towards the BE to populate a starting dictionary. This isn't the most elegant solution, but it was the easiest one at the time.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | .NET 10, ASP.NET Core, C# |
| Frontend | React 19, TypeScript, MUI v9, Vite |
| API Client | Orval (generated dynamically from OpenAPI spec) |
| Testing | xUnit (backend) |

## Architecture & Design Tradeoffs

To meet the requirements of a fast, thread-safe, in-memory system, the backend architecture
relies on a two step

### 1. Lock-Free O(1) Reads

The repository maintains two distinct structures:

- `_graph`: The mutable source of truth
- `_snapshot`: An immutable projection 

This snapshot is swapped via `Volatile.Read` and `Volatile.Write` on every write
operation. Because the snapshot is immutable, reads are entirely lock-free. A synonym lookup requires only a single dictionary lookup, since the snapshot already contains all synonym links.

### 2. Transitive Synonyms are resovled when writing

Transitive synonyms are resolved whenever the graph is updated. Each `SnapshotEntry` stores a word, and its arrays of direct synonyms and `TransitiveSynonym` objects.

The benefit of this approach is that it enables `GetSynonyms` to execute in O(1) time

### 3. CPU & Memory Optimization

When a user adds or edits a word, `RebuildSnapshot` copies the existing snapshot forward and recomputes only the specific synonym clusters affected by the updated word.

The trade off for this, is that each word's resolved synonyms are stored twice, once in the `_graph`
and once in the precomputed `_snapshot`.

## Local Development

### Running in Docker

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running, then from the repo root:

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger |

To stop and remove the containers:

```bash
docker compose down
```

### Prerequisites (local development without Docker)

- .NET 10 SDK
- Node.js 20+

### Running the Backend

```bash
cd backend
dotnet run --project src/SynonymsTool.Api
```

- **API Address:** `http://localhost:5172`
- **Swagger UI:** `http://localhost:5172/swagger`

### Running the Frontend

The frontend uses an environment variable (`frontend/.env`) to point the generated client at
the backend: `VITE_API_URL=http://localhost:5172`

```bash
cd frontend
npm install
npm run dev
```

- **UI Address:** `http://localhost:5173`

### Running Tests

```bash
cd backend
dotnet test SynonymsTool.slnx
```

## Client Code Generation

The backend generates `backend/src/SynonymsTool.Api/swagger.json` on every `dotnet build`. To
keep the frontend strictly typed, you can regenerate the TypeScript API client after any
backend contract change:

```bash
cd frontend
npm run generate:api
```

## API Reference
*Full interactive documentation is available locally at: `http://localhost:5172/swagger`*



## Things to consider for future
- Adding text as translation keys in order to enable localised webpage. 
- Adding a cool graph view to explore the synonym connections in.