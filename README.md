### Project Description
A full stack web application inspired by Shadertoy where users can edit, compile, and preview fragment shaders rendered on a FSQ. Users can share, remix, and browse their creations.

### Core Features

- **Editor**: Real-time GLSL editing with syntax highlighting and error display
- **Preview**: Live WebGL compilation and rendering
- **Accounts**: User authentication with Sign-Up/Sign-In
- **Sharing**: Save shaders (public/private) with unique URLs
- **Gallery**: Browse public shaders with thumbnails
- **Forking**: Copy and modify other users' shaders

### Tech Stack
**Frontend**
- React, TypeScript, Tailwind CSS
- Three.js (WebGL rendering)
- CodeMirror (code editor)
- react-router-dom (routing)

**Backend**
- Node.js, Express, TypeScript
- PostgreSQL + Prisma (database)
- bcrypt + jsonwebtoken (auth)
- cors, dotenv (utilities)

**Infrastructure**
- GitHub (version control)
- Vercel (frontend hosting)
- Railway/Render or AWS EC2 (backend hosting)

#### Implementation Roadmap

**Foundation**
- [ ] 3 React/Tailwind pages skeletons
    - (Gallery, Shader Editor/Player, Sign In / Sign Up)
    - Navigate between them
- [ ] Set up database and scheme with Prisma
- [ ] Set up basic Express API to do Prisma queries

**Core Features**
- [ ] Shader editor with syntax highlighting
- [ ] Compile and error highlighting
- [ ] Shader player
- [ ] Account creation/Sign In logic with authentication
- [ ] Save and load shaders with unique URLs
- [ ] Shader gallery
- [ ] Fork shader

**Finish and Polish**
- [ ] Deploy using Vercel and AWS/Railway/Render
- [ ] Debug
- [ ] Make front end look GOOD

**Nice to Have (Not MVP)**
- [ ] Public/Private shaders
- [ ] Social features (liking, commenting)
- [ ] My Account page