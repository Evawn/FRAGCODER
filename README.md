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

### Debugging

The project includes comprehensive debugging configurations for both frontend and backend development.

#### How to Debug

**1. Frontend Debugging:**
- Open VS Code and press `F5` or go to Run → Start Debugging
- Select **"Debug Frontend (Chrome)"** or **"Debug Frontend (Edge)"**
- Set breakpoints in your React/TypeScript files by clicking in the gutter
- Chrome/Edge will launch and connect to your Vite dev server at http://localhost:5173
- The debugger will pause execution at your breakpoints

**2. Backend Debugging:**
- Select **"Debug Backend"** from the debug dropdown
- Or run `npm run debug` in the backend folder to start with inspector
- Set breakpoints in your Express/TypeScript files
- The debugger will stop at breakpoints and allow inspection of variables

**3. Full Stack Debugging:**
- Select **"Debug Full Stack"** to debug both frontend and backend simultaneously
- This launches both debuggers in parallel
- You can set breakpoints in both frontend and backend code
- Great for debugging API calls and full request/response cycles

**4. Attach to Running Process:**
- If backend is already running with `npm run debug`
- Select **"Attach to Backend"** to connect the debugger
- Useful when you want to start debugging an already running server

#### Debugging Controls
- **F5**: Continue/Start debugging
- **F10**: Step Over (execute current line)
- **F11**: Step Into (go into function calls)
- **Shift+F11**: Step Out (exit current function)
- **F9**: Toggle Breakpoint
- **Ctrl+Shift+F5**: Restart debugging
- **Shift+F5**: Stop debugging

#### Debug Features
- **Breakpoints**: Click in the gutter next to line numbers
- **Watch Variables**: Add expressions to watch their values
- **Call Stack**: See the execution path
- **Variables**: Inspect local and global variables
- **Debug Console**: Execute code in the current context
- **Conditional Breakpoints**: Right-click to add conditions

The setup includes source maps for both frontend and backend, allowing you to debug TypeScript code directly rather than compiled JavaScript.