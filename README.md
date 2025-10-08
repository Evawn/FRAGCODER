Quick Links: [[Shadertoy Project TODO]], 
### Core Features
- **4/5 Web Pages**: Home, Gallery, Shader Editor and Player, Sign in & Registration
- **Editor**: GLSL fragment shader code editor with real-time syntax highlighting, completion tooltips, built-in uniforms, and collapsible lines
- **Compiling & Debug**: Can compile user shaders with up to 4 optional pre-passes and a common code tab. compilation errors are displayed with in-line decorations in the editor
- **Preview**: Live WebGL compilation and rendering, play/pause, etc.
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

#### Implementation Roadmap

**Foundation**
- [x] 3 React/Tailwind pages skeletons
    - (Gallery, Shader Editor/Player, Sign In / Sign Up)
    - Navigate between them
- [x] Set up database and scheme with Prisma
- [x] Set up basic Express API to do Prisma queries

**Core Features**
- [x] Shader editor with syntax highlighting
- [x] Compile and error highlighting
- [x] Shader player
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