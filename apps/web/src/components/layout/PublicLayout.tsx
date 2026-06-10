import { Outlet } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex h-16 items-center px-4">
          <span className="font-semibold">Sở Y Tế Hà Nội</span>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2025 Sở Y Tế Hà Nội
      </footer>
    </div>
  )
}
