import { Link } from 'react-router-dom'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Đăng ký tài khoản</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tính năng đang phát triển</p>
        <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  )
}
