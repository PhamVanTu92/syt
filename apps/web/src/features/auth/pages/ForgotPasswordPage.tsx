import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useForgotPassword } from '../api/auth.queries'

const schema = z.object({ email: z.string().email('Email không hợp lệ') })
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { mutate, isPending } = useForgotPassword()
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Kiểm tra hộp thư của bạn</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">Quên mật khẩu</h1>
        <form onSubmit={handleSubmit((d) => mutate(d.email, { onSuccess: () => setSent(true) }))}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="mt-4 w-full rounded-md bg-primary py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
