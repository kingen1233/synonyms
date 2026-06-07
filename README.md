# Synonym Dictionary – Full-Stack Developer Assessment

A production-ready, full-stack in-memory synonym search tool. This application allows users
to link words bidirectionally and automatically resolves all transitive connections (i.e.,
if B is a synonym of A, and C is a synonym of B, then C is automatically a synonym of A).

This solution was designed with a heavy focus on **read performance, thread-safety, and
maintainability** to reflect production-level engineering standards.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | .NET 10, ASP.NET Core, C# |
| Frontend | React 19, TypeScript, MUI v9, Vite |
| API Client | Orval (generated dynamically from OpenAPI spec) |
| Testing | xUnit (backend) |

## Architecture & Design Tradeoffs

To meet the requirements of a fast, thread-safe, in-memory system, the backend architecture
relies on a **Copy-on-Write Read Snapshot** pattern.

### 1. Lock-Free $\mathcal{O}(1)$ Reads

The repository maintains two distinct structures:

- `_graph`: The mutable source of truth (a `Dictionary`).
- `_snapshot`: An immutable, fully-resolved read projection.

This snapshot is swapped atomically via `Volatile.Read` and `Volatile.Write` on every write
operation. Because the snapshot is immutable, **reads are entirely lock-free**. A synonym
lookup requires only a single dictionary lookup—there is no graph traversal or thread
blocking during client queries.

### 2. Transitive Resolution at Write-Time

Transitive synonyms are resolved during `RebuildSnapshot`, not at query time. Each
`SnapshotEntry` stores pre-sorted arrays of direct synonyms and `TransitiveSynonym` objects.

- A `TransitiveSynonym` pairs the target word with its `ClosestNeighbour` (the direct
  neighbor of the queried word on the shortest BFS path to the target, computed via
  `SynonymGraphUtils.BfsParents`).
- **The Benefit:** `GetSynonyms` executes in $\mathcal{O}(1)$ time, returning precomputed
  arrays straight from the snapshot.

### 3. CPU & Memory Optimization

When a user adds or edits a word, the system does not rebuild the entire dictionary from
scratch. `RebuildSnapshot` copies the existing snapshot forward and recomputes **only** the
specific synonym clusters touched by the write (using BFS via
`SynonymGraphUtils.FindClusters`). Untouched clusters are ignored.

- **The Tradeoff:** Each word's resolved synonyms are stored twice (once in the raw `_graph`
  and once in the precomputed `_snapshot`). This slight duplication in memory footprint is
  an intentional tradeoff to buy lock-free, lightning-fast $\mathcal{O}(1)$ reads under
  heavy concurrent load. The extra memory per transitive entry is just one `Word` reference,
  keeping the memory bounds strict.

## Local Development

### Prerequisites

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

The backend emits `backend/src/SynonymsTool.Api/swagger.json` on every `dotnet build`. To
keep the frontend strictly typed, you can regenerate the TypeScript API client after any
backend contract change:

```bash
cd frontend
npm run generate:api
```

## API Reference

Base path: `/api/synonyms`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Link two words as bidirectional synonyms |
| `GET` | `/{word}` | Get all synonyms for a word (direct + transitive) |
| `GET` | `/search?term=` | Substring-search the dictionary |
| `GET` | `/words/all` | Return every word, sorted alphabetically |
| `DELETE` | `/link` | Remove a direct synonym link (both words remain) |
| `DELETE` | `/word/{word}` | Remove a word and all its links |
| `PUT` | `/{word}` | Rename a word everywhere it appears |

*Full interactive documentation is available locally at: `http://localhost:5172/swagger`*



## THings to consider for future
- Adding text as translation keys in order to enable localised webpage. 