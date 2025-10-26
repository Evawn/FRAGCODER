# FRAGCODER
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000.svg)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

#### FRAGCODER lets you Code, Render, and Share GLSL fragment shaders directly from your browser. Inspired by Shadertoy.

#### **[LIVE DEMO → fragcoder.vercel.app](https://fragcoder.vercel.app)**
#### **[Official Trailer: Youtube](https://www.youtube.com/watch?v=crJRdM2m-bQ)**

Built as a passion-portfolio project, [FRAGCODER](https://fragcoder.vercel.app) provides the same in-browser shader coding experience as [Shadertoy](https://shadertoy.com) - with a modernized, responsive UI with many add quality-of-life features, including improved compilation times, autocompletion tooltips, resizeable UI panels, and much more!

![Shader Gallery](images/Editor%20Slide.png)

## Core Features:
- **Advanced Code Editor** with syntax highlighting, autocomplete, & in-line error display
- **Custom GLSL Compiler** with multi-pass support and error parsing
- **Real-time WebGL Rendering** - just click 'Compile' to view your shader
- **Secure Authentication** via Google OAuth and JWT
- **Clone & Share** shaders with unique URLs
- **Public Gallery** with shader browsing and discovery
- **Integrated Unit Testing** with Vitest, React Testing Library
- **Production-Ready Infrastructure** using Docker and CI/CD

![Shader Gallery](images/Gallery%20Slide.png)

## Technical Details:
- **Frontend**: React 19, Vite, TailwindCSS, CodeMirror 6, WebGL, React Router, Axios
- **Backend**: Express 5, Prisma 6, PostgreSQL, JWT, Google OAuth, CORS
- **DevOps**: Docker/Docker Compose, Vercel, Railway, PostgreSQL, GitHub Actions

---

![DevOps Pipeline](images/DevOps%20Slide.png)

## Architecture Highlights

### Type-Safe Monorepo
- Shared TypeScript types between frontend and backend prevent runtime errors
- Single source of truth for API contracts

### Clean Separation of Concerns
- **Declarative UI** (React hooks and components)
- **Imperative Business Logic** (pure functions and utilities)
- **Service Layer Pattern** for database operations
- **Custom Error Hierarchy** with HTTP semantics

![Technical Architecture](images/Technical%20Architecture.png)

## Getting Started
[LIVE DEMO → fragcoder.vercel.app](https://fragcoder.vercel.app)

If you want to run FRAGCODER yourself, the easiest way is with Docker. This method requires no manual dependency installation or database setup.

**See [README-DOCKER.md](README-DOCKER.md) for detailed Docker documentation.**

## Testing
- **See [TESTING.md](TESTING.md) for testing instructions.**

## Roadmap

#### Planned Features
- Private Shaders
- Accessibility Audit
- 'My Account' Page
- Account Deletion
- Social Features (like, comment)
- Editor: Reimplement In-Line Error Decorations
- Editor: Add Find and Replace

#### Known Issues
- 'Undo'/'Redo' is not tracked per-tab in the editor
- Deleting a highlighted selection with an error decoration causes a crash

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Contributing

*This project is currently not accepting PRs yet*
## About

Built with <3 by **Evan Azari** (2025) | [GitHub](https://github.com/Evawn/) | [LinkedIn](https://www.linkedin.com/in/eazari/)

Questions? [Open an issue](https://github.com/Evawn/FRAGCODER/issues)