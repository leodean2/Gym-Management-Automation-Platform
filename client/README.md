# Client (React + Vite)

Not yet scaffolded. When ready:

    npm create vite@latest . -- --template react
    npm install react-router-dom @tanstack/react-query react-hook-form zod

Suggested structure to mirror the server's module boundaries:

    src/
      features/
        auth/
        members/
        memberships/
        ...
      components/       # shared UI components
      lib/               # API client, query client setup
      routes/            # React Router route definitions
